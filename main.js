const yargs = require('yargs');
const open = require('open');
const notifier = require('node-notifier')
const fs = require('fs')
const path = require('path')
const express = require("express");
const google = require("googleapis").google;

const tokenFn = path.join(__dirname, ".authtoken")
const subsFn = path.join(__dirname, "subs.json")
const tmpsubsFn = path.join(__dirname, "tmpsubs.json")

// Google's OAuth2 client
const OAuth2 = google.auth.OAuth2

// Including our config file
const CONFIG = require("./config");

// https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/
const argv = yargs
    .option('checkival', {
        description: 'check/retrieval interval (minutes). Beware! 50 subs per request, total Youtube Data API request limit is 10k per day.',
        type: 'number',
    })
    .default('checkival', 60)
    .help()
    .alias('help', 'h')
    .argv;


// Creating our express application
const app = express();

// Setting up Views
app.set("view engine", "ejs");
app.set("views", __dirname);

app.get("/", function(req, res) {
  // Create an OAuth2 client object from the credentials in our config file
  const oauth2Client = new OAuth2(
    CONFIG.oauth2Credentials.client_id,
    CONFIG.oauth2Credentials.client_secret,
    CONFIG.oauth2Credentials.redirect_uris[0]
  );

  // Obtain the google login link to which we'll send our users to give us access
  const loginLink = oauth2Client.generateAuthUrl({
    access_type: "offline", // Indicates that we need to be able to access data continously without the user constantly giving us consent
    scope: CONFIG.oauth2Credentials.scopes // Using the access scopes from our config file
  });
  return res.render("index", { loginLink: loginLink });
});

app.get("/oauth2callback", function(req, res) {
  // Create an OAuth2 client object from the credentials in our config file
  const oauth2Client = new OAuth2(
    CONFIG.oauth2Credentials.client_id,
    CONFIG.oauth2Credentials.client_secret,
    CONFIG.oauth2Credentials.redirect_uris[0]
  );

  if (req.query.error) {
    // The user did not give us permission.
    return res.redirect("/");
  } else {
    oauth2Client.getToken(req.query.code, function(err, token) {
      if (err) return res.redirect("/");

      fs.writeFileSync(tokenFn, JSON.stringify(token))
      console.log("token " + JSON.stringify(token) + " stored in: " + tokenFn)

      // Store the credentials given by google into a jsonwebtoken in a cookie called 'jwt'
      //res.cookie("jwt", jwt.sign(token, CONFIG.JWTsecret));
      return res.redirect("/get_some_data");
    });
  }
});

app.get("/get_some_data", function(req, res) {
  if (!fs.existsSync(tokenFn)) {
    // We haven't logged in
    return res.redirect("/");
  }

  // Create an OAuth2 client object from the credentials in our config file
  const oauth2Client = new OAuth2(
    CONFIG.oauth2Credentials.client_id,
    CONFIG.oauth2Credentials.client_secret,
    CONFIG.oauth2Credentials.redirect_uris[0]
  );

  // Add this specific user's credentials to our OAuth2 client
  //oauth2Client.credentials = jwt.verify(req.cookies.jwt, CONFIG.JWTsecret);
  oauth2Client.credentials = JSON.parse(fs.readFileSync(tokenFn))
  console.log("cred: ", oauth2Client.credentials)
  console.log("expiry: " + new Date(oauth2Client.credentials.expiry_date))

  // Get the youtube service
  const service = google.youtube("v3");

  // Get five of the user's subscriptions (the channels they're subscribed to)
  service.subscriptions
    .list({
      auth: oauth2Client,
      mine: true,
      part: "snippet,contentDetails",
      order: "alphabetical",
      maxResults: 50
    })
    .then(response => {
      //console.log(response.data.items)
      console.log(response.data.items.length)
      console.log(response.data.items[response.data.items.length-1])
      console.log(response.data.items[0].snippet.title)
      console.log(response.data.items[0].snippet.channelId)
      console.log(response.data.items[0].snippet.resourceId)
      console.log(response)
      //console.log(response.data.items[0].snippet.thumbnails.medium.url)
      // Render the data view, passing the subscriptions to it
      return res.render("data", { subscriptions: response.data.items });
    });
});

app.get("/changed", function(req, res) {
    var _subs = JSON.parse(fs.readFileSync(subsFn))
    var subs = JSON.parse(fs.readFileSync(tmpsubsFn)) // new
    var _subsMap = new Map();
    var subsMap = new Map();
    _subs.forEach(i => _subsMap.set(i.snippet.title, i.snippet.title))
    subs.forEach(i => subsMap.set(i.snippet.title, i.snippet.title))
    var removedSubs = []
    _subs.forEach(i => {
      if (!subsMap.has(i.snippet.title)) {
        removedSubs.push(i)
      }      
    })
    return res.render("changed", { subs: removedSubs })
});

app.get("/changedConfirm", function(req, res) {
    if (fs.existsSync(tmpsubsFn)) {
        fs.unlinkSync(subsFn)
        fs.renameSync(tmpsubsFn, subsFn)
    }
    return res.render("changedConfirm", {})
});

// Listen on the port defined in the config file
app.listen(CONFIG.port, function() {
  console.log(`Listening on port ${CONFIG.port}`);
});


async function bghandler() {
  try {
    var cred = JSON.parse(fs.readFileSync(tokenFn))

    const oauth2Client = new OAuth2(
        CONFIG.oauth2Credentials.client_id,
        CONFIG.oauth2Credentials.client_secret,
        CONFIG.oauth2Credentials.redirect_uris[0]
    )
      
    oauth2Client.credentials = cred
    console.log("cred: ", oauth2Client.credentials)
    console.log("expiry: " + new Date(oauth2Client.credentials.expiry_date))
    
    const service = google.youtube("v3")
    
    var res = await service.subscriptions
    .list({
      auth: oauth2Client,
      mine: true,
      part: "snippet,contentDetails",
      order: "alphabetical",
      maxResults: 50
    })
    console.log("page token: ", res.data.nextPageToken)
    var subs = res.data.items
    while(res.data.nextPageToken !== void 0) {
      res = await service.subscriptions.list({
        auth: oauth2Client,
        mine: true,
        part: "snippet,contentDetails",
        order: "alphabetical",
        pageToken: res.data.nextPageToken,
        maxResults: 50
      })
      console.log("page token: ", res.data.nextPageToken)
      res.data.items.forEach(item => subs.push(item))
    }
    console.log("total subs: ", subs.length)

    if (oauth2Client.credentials.expiry_date != cred.expiry_date) {
      fs.writeFileSync(tokenFn, JSON.stringify(oauth2Client.credentials))
    }
  
    var delCount = 0
    var addCount = 0
  
    if (fs.existsSync(subsFn)) {
      var _subs = JSON.parse(fs.readFileSync(subsFn))
      var _subsMap = new Map(); // old
      var subsMap = new Map();
      _subs.forEach(i => _subsMap.set(i.snippet.title, i.snippet.title))
      subs.forEach(i => subsMap.set(i.snippet.title, i.snippet.title))
      _subs.forEach(i => {
        if (!subsMap.has(i.snippet.title)) {
          delCount++;
        }      
      })
      subs.forEach(i => {
        if (!_subsMap.has(i.snippet.title)) {
          addCount++;
        }      
      })
    } else {
      fs.writeFileSync(subsFn, JSON.stringify(subs))
    }
  
    if (delCount > 0) {
      fs.writeFileSync(tmpsubsFn, JSON.stringify(subs))
      notifier.notify(
          {
            title: 'UTube Unsub Tracker',
            message: 'Unsubbed channels detected. Click here!'
          },
          function (err, response, metadata) {
            console.log("notification callback: ", err, response, metadata)
            if (response == 'activate') {
              open(CONFIG.baseURL + "/changed")
            }
          }
        );
    }
    else if (addCount > 0) {
      fs.writeFileSync(subsFn, JSON.stringify(subs))
    }
  } catch (err) {
      console.log(err)
      return
  }
}

var bgtimer = setInterval(bghandler, argv.checkival*60*1000)