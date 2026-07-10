// backend/src/config/googleAuth.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './credentials/credentials.json';
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || './credentials/token.json';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets'
];

async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Google API Credentials file not found at ${CREDENTIALS_PATH}. Please follow instructions in Md/README.md to set it up.`);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
    // Auto-refresh jika token kadaluarsa
    oAuth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        const updatedToken = { ...token, ...tokens };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken));
      }
    });
    return oAuth2Client;
  }

  return getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('\n⚠️  Autentikasi diperlukan. Buka URL ini di browser:\n');
  console.log(authUrl);
  console.log('\n');

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Masukkan kode dari halaman tersebut: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        // Ensure credentials folder exists
        const dir = path.dirname(TOKEN_PATH);
        if (!fs.existsSync(dir)){
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token tersimpan di', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { getAuthClient };
