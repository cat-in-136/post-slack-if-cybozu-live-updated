// require https://script.google.com/macros/library/versions/d/1CXDCY5sqT9ph64fFwSzVtXnbjpSfWdRymafDrtIZ7Z_hwysTY7IIhi7s

var scriptProperties = PropertiesService.getScriptProperties();
var SLACK_WEBHOOK_URL = scriptProperties.getProperty("SLACK_WEBHOOK_URL");
var SLACK_NOTIFY_CHANNEL = scriptProperties.getProperty("SLACK_NOTIFY_CHANNEL"); // OPTIONAL
var SLACK_ERROR_NOTIFY_CHANNEL = scriptProperties.getProperty("SLACK_ERROR_NOTIFY_CHANNEL"); // OPTIONAL
var CYBOZULIVE_CONSUMER_KEY = scriptProperties.getProperty("CYBOZULIVE_CONSUMER_KEY");
var CYBOZULIVE_CONSUMER_SECRET = scriptProperties.getProperty("CYBOZULIVE_CONSUMER_SECRET");
var CYBOZULIVE_ACCESS_TOKEN = scriptProperties.getProperty("CYBOZULIVE_ACCESS_TOKEN");
var CYBOZULIVE_ACCESS_TOKEN_SECRET = scriptProperties.getProperty("CYBOZULIVE_ACCESS_TOKEN_SECRET");
var CYBOZULIVE_TARGET_GROUP_ID = scriptProperties.getProperty("CYBOZULIVE_TARGET_GROUP_ID"); // OPTIONAL

function escapeSlack(str) {
  if (!!str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  } else {
    return null;
  }
}
// http://delete.me.uk/2005/03/iso8601.html
function getDateFromIso8601(str) {
  try{
    var aDate = new Date();
    var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
        "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\\.([0-9]+))?)?" +
        "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
    var d = str.match(new RegExp(regexp));

    var offset = 0;
    var date = new Date(d[1], 0, 1);

    if (d[3]) { date.setMonth(parseInt(d[3], 10) - 1); }
    if (d[5]) { date.setDate(parseInt(d[5], 10)); }
    if (d[7]) { date.setHours(parseInt(d[7], 10)); }
    if (d[8]) { date.setMinutes(parseInt(d[8], 10)); }
    if (d[10]) { date.setSeconds(parseInt(d[10], 10)); }
    if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
    if (d[14]) {
      offset = (parseInt(d[16], 10) * 60) + parseInt(d[17], 10);
      offset *= ((d[15] == '-') ? 1 : -1);
    }

    offset -= date.getTimezoneOffset();
    time = (Number(date) + (offset * 60 * 1000));
    aDate.setTime(Number(time));
    return aDate;
  } catch(e){
    return null;
  }
}
function compareDate(a, b) {
  var a_str = Utilities.formatDate(a, "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  var b_str = Utilities.formatDate(b, "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  return a_str.localeCompare(b_str);
}

function postMessageToSlack(payload) {
  return UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}

/** Configures cybozu live service. */
function getCybozuLiveService() {
  return OAuth1.createService("cybozu-live")
  .setConsumerKey(CYBOZULIVE_CONSUMER_KEY)
  .setConsumerSecret(CYBOZULIVE_CONSUMER_SECRET)
  .setAccessToken(CYBOZULIVE_ACCESS_TOKEN, CYBOZULIVE_ACCESS_TOKEN_SECRET);
  
  // Note: DO NOT set URLs in case of manual access token configuration using setAccessToken().
  //.setAccessTokenUrl("https://api.cybozulive.com/oauth/token")
  //.setRequestTokenUrl("https://api.cybozulive.com/oauth/initiate")
  //.setAuthorizationUrl("https://api.cybozulive.com/oauth/authorize")
}

function getXMLFromPath(tags, parent) {
  var element = parent;
  for (var i = 0; i < tags.length; i++) {
    element = element.getChild(tags[i][0], tags[i][1]);
    if (!element) {
      break;
    }
  }
  return element;
}
function getXMLText(tags, parent) {
  var element = getXMLFromPath(tags, parent);
  return (!!element)? element.getText() : null;
}
function getXMLAttribute(tags, attr, parent) {
  var element = getXMLFromPath(tags, parent);
  var attr = (!!element)? element.getAttribute(attr) : null;
  return (!!attr)? attr.getValue() : null;
}

function createAttachmentsFromXML(xml) {
  var attachments = [];
  var document = XmlService.parse(xml);
  var atom = XmlService.getNamespace("http://www.w3.org/2005/Atom");
  
  var dividion;
  var updateTime = scriptProperties.getProperty("__UPDATE_TIME");
  if (!!updateTime && !isNaN(parseInt(updateTime, 10))) {
    dividion = new Date(parseInt(updateTime, 10) * 1000);
  } else {
    // set to 5 minutes ago
    dividion = new Date((new Date()).getTime() - 5*60*1000);
  }

  var entries = document.getRootElement().getChildren("entry", atom);
  for (var i = 0; i < entries.length; i++) {
    var title = getXMLText([["title", atom]], entries[i]);
    var author = getXMLText([["author", atom], ["name", atom]], entries[i]);
    var updated = getXMLText([["updated", atom]], entries[i]);
    if (!!updated) { updated = getDateFromIso8601(updated); }
    var summary = getXMLText([["summary", atom]], entries[i]);
    var link = getXMLAttribute([["link", atom]], "href", entries[i]);
    
    //Logger.log({title: title, author: author, updated: updated, summary: summary, link: link});
    
    var summaryTruncated = (summary && summary.length > 100)? (summary.substring(0, 100-3) + "...") : summary;
    
    if (updated && (updated - dividion > 0)) {
      var body = Utilities.formatString("<%s|%s>", link, escapeSlack(title));
      if (!!author) { body += Utilities.formatString(" by %s", escapeSlack(author)); }
      body += Utilities.formatString(" at %s", updated);
      body += Utilities.formatString("> %s", escapeSlack(summaryTruncated).replace(/\r?\n/g, "\n> "));
      
      Logger.log("cybozu post: %s", body);
      
      attachments.push({
        fallback: body,
        title: title,
        title_link: link,
        author_name: author,
        text: summary,
        ts: updated.getTime() / 1000
      });
    }
  }
  
  return attachments;
}

function run() {
  try {
    var cybozuService = getCybozuLiveService();
    if (cybozuService.hasAccess()) {
      var notificationUrl = "https://api.cybozulive.com/api/notification/V2";
      if (!!CYBOZULIVE_TARGET_GROUP_ID) { notificationUrl += "?group=" + (CYBOZULIVE_TARGET_GROUP_ID); }
      var response = cybozuService.fetch(notificationUrl);
      var result = response.getContentText();
      
      var attachments = createAttachmentsFromXML(result);
      
      if (attachments.length > 0) {
        Logger.log("post to slack : %s posts", attachments.length);
        
        postMessageToSlack({
          channel: SLACK_NOTIFY_CHANNEL || "#general",
          as_user: false,
          username: "cybozu live notification",
          icon_url: "https://cybozulive.com/static/62fe2c63f0/images/og_image.png",
          attachments: attachments
        });
      }
    } else {
      Logger.log("Could not access to the cybozu endpoint. Check your configuration.");
      throw new Error("Could not access to the cybozu endpoint. Check your configuration.");
    }
    
    // Store (successfully) update time.
    scriptProperties.setProperty("__UPDATE_TIME", parseInt((new Date()).getTime() / 1000).toString(10));
  } catch (ex) {
    var attachments = [{
      fallback: Utilities.formatString("%s", ex),
      color: "#ff0000",
      title: ex.name,
      text: ex
    }];
    if (ex.stack) {
      attachments.push({
        fallback: Utilities.formatString("%s", ex.stack),
        color: "#ff0000",
        title: "Stack Trace",
        text: ex.stack
      });
    }
    
    postMessageToSlack({
      channel: SLACK_ERROR_NOTIFY_CHANNEL || SLACK_NOTIFY_CHANNEL || "#general",
      text: ":mask: Executatin Error",
      attachments: attachments
    });
  }
}
