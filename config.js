const port = 5777;
const baseURL = `http://localhost:${port}`;

// this is the oauth2 json file downloadable from Google Cloud Platform console and
// it contains the credentials for your "app". This sets up the scope for the login
// process that will yield the real authentication scope/token stored in ".authtoken".
// You'll have to set up your own "app" in their GCP console and add your email to
// the list of allowed testers. Beware: upon logging in using Google's login web
// frontend, it will somewhat "hide" the login possibility and highlight the abort
// option instead because you will be using your "app" in test mode.
keys = require("./secretauth.json");

if (keys.web === void 0) {
  keys.web = keys.internal
}

module.exports = {

  baseURL: baseURL,
  port: port,

  // The credentials and information for OAuth2
  oauth2Credentials: {
    client_id: keys.web.client_id,
    project_id: keys.web.project_id, // The name of your project
    auth_uri: keys.web.auth_uri,
    token_uri: keys.web.token_uri,
    auth_provider_x509_cert_url: keys.web.auth_provider_x509_cert_url,
    client_secret: keys.web.client_secret,
    redirect_uris: [`${baseURL}/oauth2callback`],
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"]
  }
};
