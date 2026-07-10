// backend/src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const { getAuthClient } = require('../config/googleAuth');
const { getTransactions, saveTransactions, updateTransactionCategory } = require('../services/sheetsService');
const { runEmailSync } = require('../services/schedulerService');

// GET /api/transactions — ambil semua transaksi dengan filter opsional
router.get('/', async (req, res, next) => {
  try {
    const auth = await getAuthClient();
    const { month, year, category, type, bank } = req.query;
    const transactions = await getTransactions(auth, { month, year, category, type, bank });
    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions — tambah transaksi manual
router.post('/', async (req, res, next) => {
  try {
    const { amount, type, category, date, merchant, notes, bank } = req.body;
    if (!amount || !type || !category || !date) {
      return res.status(400).json({ success: false, message: 'Field amount, type, category, dan date wajib diisi.' });
    }
    const auth = await getAuthClient();
    const manualTransaction = {
      emailId: `manual-${Date.now()}`,
      referenceId: `MAN-${Date.now()}`,
      date: new Date(date).toISOString(),
      type,
      amount: parseInt(amount, 10),
      merchant: merchant || 'Manual Input',
      category,
      notes: notes || '',
      source: 'manual',
      bank: bank || 'Manual',
    };
    await saveTransactions(auth, [manualTransaction]);
    res.status(201).json({ success: true, message: 'Transaksi berhasil ditambahkan.', data: manualTransaction });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/transactions/:id/category — update kategori
router.patch('/:id/category', async (req, res, next) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ success: false, message: 'Category wajib diisi.' });
    const auth = await getAuthClient();
    await updateTransactionCategory(auth, req.params.id, category);
    res.json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions/sync — trigger sync manual
router.post('/sync', async (req, res, next) => {
  try {
    await runEmailSync();
    res.json({ success: true, message: 'Sinkronisasi email selesai.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
