// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getAuthClient } = require('../config/googleAuth');
const { getTransactions } = require('../services/sheetsService');

// GET /api/dashboard/summary?month=6&year=2026&bank=SeaBank
router.get('/summary', async (req, res, next) => {
  try {
    const auth = await getAuthClient();
    const now = new Date();
    const month = req.query.month || (now.getMonth() + 1);
    const year = req.query.year || now.getFullYear();
    const bank = req.query.bank;

    const transactions = await getTransactions(auth, { month, year, bank });

    const totalIncome = transactions
      .filter(t => t.type === 'Transfer Masuk' || t.type === 'Pemasukan')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type !== 'Transfer Masuk' && t.type !== 'Pemasukan')
      .reduce((sum, t) => sum + t.amount, 0);

    // Breakdown per kategori
    const categoryBreakdown = transactions.reduce((acc, t) => {
      if (t.type !== 'Transfer Masuk' && t.type !== 'Pemasukan') {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
      }
      return acc;
    }, {});

    // Pengeluaran per minggu
    const weeklyExpense = [0, 0, 0, 0];
    transactions.forEach(t => {
      if (t.type !== 'Transfer Masuk' && t.type !== 'Pemasukan') {
        const day = new Date(t.date).getDate();
        const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
        weeklyExpense[weekIndex] += t.amount;
      }
    });

    res.json({
      success: true,
      data: {
        period: { month, year, bank: bank || 'Semua' },
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        transactionCount: transactions.length,
        categoryBreakdown,
        weeklyExpense: weeklyExpense.map((amount, i) => ({
          week: `Minggu ${i + 1}`,
          amount
        })),
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
