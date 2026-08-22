// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getAuthClient } = require('../config/googleAuth');
const { getTransactions, calculateFinancialSummary } = require('../services/sheetsService');

// GET /api/dashboard/summary?month=6&year=2026&bank=SeaBank
router.get('/summary', async (req, res, next) => {
  try {
    const auth = await getAuthClient();
    const now = new Date();
    const month = req.query.month || (now.getMonth() + 1);
    const year = req.query.year || now.getFullYear();
    const bank = req.query.bank;

    const transactions = await getTransactions(auth, { month, year, bank });
    const summaryData = calculateFinancialSummary(transactions, { month, year, bank });

    res.json({
      success: true,
      data: summaryData
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
