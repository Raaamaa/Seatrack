// backend/src/routes/voiceRoutes.js
const express = require('express');
const router = express.Router();
const { getAuthClient } = require('../config/googleAuth');
const { processVoiceCommand } = require('../services/voiceService');

// POST /api/voice/process — proses transkrip suara pengguna
router.post('/process', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Field text wajib diisi dan tidak boleh kosong.'
      });
    }

    const auth = await getAuthClient();
    const result = await processVoiceCommand(auth, text.trim());

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
