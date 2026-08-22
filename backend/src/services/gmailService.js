// backend/src/services/gmailService.js
const { google } = require('googleapis');
const { parseEmail } = require('./parserService');
require('dotenv').config();

const SENDER_EMAILS = process.env.GMAIL_SENDER_EMAILS || 'no-reply@sea.com';

/**
 * Decode base64 string dari Gmail API
 */
function decodeBase64(encoded) {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

/**
 * Ekstrak body teks dari payload email (handle multipart)
 */
function extractBodyText(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Fallback ke HTML jika tidak ada plain text
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        const html = decodeBase64(part.body.data);
        // Strip HTML tags sederhana
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }
  return '';
}

/**
 * Ambil daftar email transaksi yang belum diproses dari berbagai bank
 * @param {object} auth - OAuth2 client
 * @param {string[]} processedIds - Daftar email ID yang sudah diproses
 */
async function fetchNewTransactionEmails(auth, processedIds = []) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  // Konstruksi query pencarian untuk multi-sender
  const sendersList = SENDER_EMAILS.split(',').map(email => email.trim());
  const fromQuery = sendersList.length > 1
    ? `from:(${sendersList.join(' OR ')})`
    : `from:${sendersList[0]}`;
  const query = `${fromQuery} is:unread`;

  try {
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20,
    });

    const messages = listResponse.data.messages || [];
    const newMessages = messages.filter(msg => !processedIds.includes(msg.id));

    if (newMessages.length === 0) {
      console.log('[Gmail] Tidak ada email transaksi baru.');
      return [];
    }

    console.log(`[Gmail] Ditemukan ${newMessages.length} email baru.`);
    const parsedTransactions = [];

    for (const msg of newMessages) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = detail.data.payload.headers;
      const senderHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const receivedAt = new Date(parseInt(detail.data.internalDate)).toISOString();
      const body = extractBodyText(detail.data.payload);

      const transaction = parseEmail({ id: msg.id, subject, body, receivedAt }, senderHeader);

      if (transaction) {
        parsedTransactions.push(transaction);
      } else {
        console.warn(`[Gmail] Gagal parse email ID: ${msg.id}, Subject: ${subject}`);
      }
    }

    return parsedTransactions;
  } catch (error) {
    console.error('[Gmail] Error fetching emails:', error.message);
    throw error;
  }
}

module.exports = { fetchNewTransactionEmails };
