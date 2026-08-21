const express = require('express');
const router = require('./transactionRoutes');

// Mock dependencies
jest.mock('../config/googleAuth', () => ({
  getAuthClient: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/sheetsService', () => ({
  getTransactions: jest.fn(),
  saveTransactions: jest.fn(),
  updateTransactionCategory: jest.fn(),
  updateTransactionDetails: jest.fn().mockResolvedValue(),
}));

jest.mock('../services/schedulerService', () => ({
  runEmailSync: jest.fn(),
}));

describe('transactionRoutes - PATCH /:id/details Validation Test Suite', () => {
  function createMockRes() {
    const res = {};
    res.statusCode = 200;
    res.status = jest.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn().mockImplementation((data) => {
      res.body = data;
      return res;
    });
    return res;
  }

  // Helper untuk mengeksekusi route handler PATCH /:id/details secara terisolasi
  async function invokePatchDetailsRoute(req, res, next) {
    const route = router.stack.find(
      (layer) => layer.route && layer.route.path === '/:id/details' && layer.route.methods.patch
    );
    const handler = route.route.stack[0].handle;
    await handler(req, res, next);
  }

  test('Mengembalikan HTTP 400 jika body tidak mengirim category maupun notes (keduanya undefined)', async () => {
    const req = { params: { id: 'TXN-123' }, body: {} };
    const res = createMockRes();
    const next = jest.fn();

    await invokePatchDetailsRoute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Minimal salah satu dari category atau notes harus dikirim.');
  });

  test('Lolos validasi (bukan 400) jika hanya category yang dikirim', async () => {
    const req = { params: { id: 'TXN-123' }, body: { category: 'Makanan & Minuman' } };
    const res = createMockRes();
    const next = jest.fn();

    await invokePatchDetailsRoute(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(true);
  });

  test('Lolos validasi (bukan 400) jika hanya notes terisi yang dikirim', async () => {
    const req = { params: { id: 'TXN-123' }, body: { notes: 'Makan siang berdua' } };
    const res = createMockRes();
    const next = jest.fn();

    await invokePatchDetailsRoute(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(true);
  });

  test('Lolos validasi (bukan 400) jika dikirim notes: "" (string kosong untuk mengosongkan catatan)', async () => {
    const req = { params: { id: 'TXN-123' }, body: { notes: '' } };
    const res = createMockRes();
    const next = jest.fn();

    await invokePatchDetailsRoute(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(true);
  });

  test('Lolos validasi (bukan 400) jika dikirim baik category maupun notes', async () => {
    const req = { params: { id: 'TXN-123' }, body: { category: 'Belanja', notes: 'Beli bulanan' } };
    const res = createMockRes();
    const next = jest.fn();

    await invokePatchDetailsRoute(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(true);
  });
});
