// backend/src/config/googleAuth.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './credentials/credentials.json';
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || './credentials/token.json';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets'
];

class UnauthenticatedError extends Error {
  constructor(message) {
    super(message || 'Autentikasi Google API diperlukan. Silakan hubungi administrator backend.');
    this.name = 'UnauthenticatedError';
    this.statusCode = 401;
  }
}

function getOAuth2Client() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    const err = new Error(`Google API Credentials file not found at ${CREDENTIALS_PATH}. Please set up credentials file.`);
    err.statusCode = 500;
    throw err;
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

function generateAuthUrl() {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
}

async function handleOAuthCallback(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return tokens;
}

async function getAuthClient() {
  const oAuth2Client = getOAuth2Client();

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oAuth2Client.setCredentials(token);
      // Auto-refresh jika token kadaluarsa
      oAuth2Client.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
          const updatedToken = { ...token, ...tokens };
          const dir = path.dirname(TOKEN_PATH);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken));
        }
      });
      return oAuth2Client;
    } catch (err) {
      throw new UnauthenticatedError('File token.json tidak valid atau rusak. Autentikasi ulang diperlukan.');
    }
  }

  // Jika token.json tidak ditemukan, lempar 401 UnauthenticatedError
  const authUrl = generateAuthUrl();
  console.warn('\n⚠️ [Auth] Token tidak ditemukan. Buka URL ini untuk otorisasi:\n' + authUrl + '\n');
  throw new UnauthenticatedError(`Autentikasi Google API diperlukan. Buka URL otorisasi di server console: ${authUrl}`);
}

module.exports = { getAuthClient, generateAuthUrl, handleOAuthCallback, UnauthenticatedError };
