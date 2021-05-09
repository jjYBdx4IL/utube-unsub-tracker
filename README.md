# utube-unsub-tracker

There are rumors about issues with Youtube "losing" customer's subscriptions.

ie. https://www.reddit.com/r/youtube/comments/5g6xji/youtube_does_not_automatically_unsubscribe_users/

This tool is intended to track your personal subscriptions, or rather their deletions.

It will check your subscriptions every hour and show a notification if one is missing.

Click on the notification and a browser page will open and show the missing subs.

## Installation

```
npm i
# if you want to use the autostart cmd script without modifications:
npm i nodemon -g
```

Then link the autostart cmd script to your startup folder (requires cygwin screen package). (on Windows: win-r, shell:startup)

### Google Cloud Platform App Credentials

This tool also requires you to create an "app" on the Google Cloud Platform console and create credentials for it (oauth2, Youtube API v3, user data, readonly). You will then have the ability to download those app credentials as a json file from the Google Cloud Platform console. Save it as `secretauth.json` in the same directory as this README file. 

### Google User Credentials

Then start the server via "node main.js" and authenticate your desired Google user by visiting http://localhost:5777 . That will put user credentials into `.authtoken` file. That will be used to schedule hourly retrievals of your complete subscription list.

After successful user authorization, the app (local server at 5777) will show you the first 50 of your subs. Ignore this page. It's just a confirmation that it basically works.

## Platform Support

This has only been tested under Windows 10.

## Origins

This project has been derived in parts from: https://github.com/gauti123456/YoutubeAuthNodeApp