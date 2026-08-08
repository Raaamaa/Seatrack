// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { generateAuthUrl, handleOAuthCallback } = require('../config/googleAuth');

// Middleware pembanding ADMIN_API_KEY (Fail-Closed)
function verifyAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;

  // Fail-Closed: Jika ADMIN_API_KEY belum dikonfigurasi di environment server
  if (!adminKey || adminKey.trim() === '') {
    return res.status(500).json({
      success: false,
      message: 'Kesalahan Konfigurasi Server: ADMIN_API_KEY belum dikonfigurasi di server.'
    });
  }

  const keyFromHeader = req.headers['x-admin-key'];
  const keyFromQuery = req.query.admin_key;

  if (keyFromHeader !== adminKey && keyFromQuery !== adminKey) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Header x-admin-key atau query admin_key tidak valid.'
    });
  }

  next();
}

// GET /api/auth/url — Dapatkan URL otorisasi OAuth Google
router.get('/url', verifyAdminKey, (req, res, next) => {
  try {
    const authUrl = generateAuthUrl();
    res.json({
      success: true,
      message: 'URL Otorisasi Google berhasil dibuat.',
      data: { authUrl }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/callback — Menerima OAuth code dari Google Redirect
router.get('/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Parameter Authorization Code (code) wajib disertakan.'
      });
    }

    await handleOAuthCallback(code);

    res.json({
      success: true,
      message: 'Autentikasi Google API berhasil! Token tersimpan secara permanen.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.verifyAdminKey = verifyAdminKey;
