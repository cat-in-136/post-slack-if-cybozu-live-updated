# post-slack-if-cybozu-live-updated

A GAS (Google App Script) to "post-slack-if-cybozu-live-updated"

## How to setup

Specify following parameters to "User Parameter".

Name                             | Description
---------------------------------|---------------------------------------------------
SLACK_WEBHOOK_URL                | URL to slack incoming-webhook. Visit https://my.slack.com/services/new/incoming-webhook/ to setup a webhook.
SLACK_NOTIFY_CHANNEL             | _OPTIONAL_ slack channel that the script post to. e.g. `#random`
SLACK_ERROR_NOTIFY_CHANNEL       | _OPTIONAL_ slack channel that the script post to in case of error. e.g. `#random`
CYBOZULIVE_CONSUMER_KEY          | Consumer key of cybozulive API. Visit https://developer.cybozulive.com/apps/add to setup an application.
CYBOZULIVE_CONSUMER_SECRET       | Consumer secret of cybozulive API.
CYBOZULIVE_ACCESS_TOKEN          | Access token of cybozulive API. Limitation: Get it on your own using OAuth.
CYBOZULIVE_ACCESS_TOKEN_SECRET   | Access token secret of cybozulive API. Limitation: Get it on your own using OAuth.
CYBOZULIVE_TARGET_GROUP_ID       | _OPTIONAL_ slack channel that the script watch. e.g. `1:12345`

Add a project trigger:

Run  |Events      |-              |-
-----|------------|---------------|--------------
run  |Time-driven | Minutes timer | Every minute

