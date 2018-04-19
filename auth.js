const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const GoogleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_DIR = `${process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE}/.credentials/`;
const TOKEN_PATH = `${TOKEN_DIR}drive-nodejs-quickstart.json`;

// Load client secrets from a local file.
const readFile = () => new Promise((resolve, reject) => fs.readFile('src/client_secret.json', 'utf8', (err, content) => {
  if (err) {
    console.log(`Error loading client secret file: ${err}`);
    reject(err);
  }
  // Authorize a client with the loaded credentials, then call the
  // Drive API.
  resolve(JSON.parse(content));
}));
/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log(`Token stored to ${TOKEN_PATH}`);
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
const getNewToken = oauth2Client => new Promise((resolve, reject) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      resolve(oauth2Client);
    });
  });
});

const readToken = oauth2Client => new Promise((resolve, reject) =>
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      getNewToken(oauth2Client).then((res) => {
        resolve(res);
      });
      return;
    }
    const oauth2 = oauth2Client;
    oauth2.credentials = JSON.parse(token);
    resolve(oauth2);
  }));
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  const clientSecret = credentials.client_secret;
  const clientId = credentials.client_id;
  const redirectUrl = credentials.redirect_uris[0];
  const auth = new GoogleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
  return Promise.resolve(readToken(oauth2Client));
}
/**
 * uploadFiles
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const uploadFiles = fileName => new Promise((resolve, reject) => {
  const file = `${fileName}.json`;
  const service = google.drive('v3');
  const fileMetadata = {
    name: file,
    parents: ['1dknwjUaqCjfcQJQuq5eTUn_InUb9xX-O'],
  };
  const media = {
    mimeType: 'application/json',
    body: fs.createReadStream(`files/${file}`),
  };

  readFile().then((authJSON) => {
    authorize(authJSON).then((auth) => {
      service.files.create({
        auth,
        resource: fileMetadata,
        media,
        fields: 'id',
      }, (err, driveFile) => {
        if (err) {
          // Handle error
          console.error(err);
        } else {
          resolve(driveFile.id);
          console.log('File Id: ', driveFile.id);
        }
      });
    });
  });
});

exports.upload = uploadFiles;
