// backend/src/services/parserService.js
const { parseSeaBankEmail } = require('./parsers/seabankParser');
const { parseBcaEmail } = require('./parsers/bcaParser');

/**
 * Mendeteksi pengirim dan mem-parsing email berdasarkan bank yang sesuai
 * @param {object} emailData - { id, subject, body }
 * @param {string} sender - Email pengirim (from)
 */
function parseEmail(emailData, sender = '') {
  const fromEmail = sender.toLowerCase();
  
  if (fromEmail.includes('sea.com') || fromEmail.includes('seabank')) {
    return parseSeaBankEmail(emailData);
  }
  
  if (fromEmail.includes('klikbca.com') || fromEmail.includes('bca.co.id')) {
    return parseBcaEmail(emailData);
  }

  // Fallback deteksi via subject jika email pengirim tidak match
  const subject = (emailData.subject || '').toLowerCase();
  if (subject.includes('seabank')) {
    return parseSeaBankEmail(emailData);
  }
  if (subject.includes('bca') || subject.includes('klikbca')) {
    return parseBcaEmail(emailData);
  }

  return null;
}

module.exports = { parseEmail };
