const { verifyAdminKey } = require('./authRoutes');

describe('verifyAdminKey Middleware (Gap 2 Fail-Closed Test)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

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

  test('Mengembalikan HTTP 500 jika ADMIN_API_KEY tidak dikonfigurasi di env', () => {
    delete process.env.ADMIN_API_KEY;

    const req = { headers: {}, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    verifyAdminKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('ADMIN_API_KEY belum dikonfigurasi');
    expect(next).not.toHaveBeenCalled();
  });

  test('Mengembalikan HTTP 401 jika ADMIN_API_KEY dikonfigurasi tetapi request tanpa key atau key salah', () => {
    process.env.ADMIN_API_KEY = 'secret123';

    const req = { headers: { 'x-admin-key': 'wrongkey' }, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    verifyAdminKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Akses ditolak');
    expect(next).not.toHaveBeenCalled();
  });

  test('Memanggil next() (HTTP 200) jika ADMIN_API_KEY dikonfigurasi dan request menyertakan key valid di header', () => {
    process.env.ADMIN_API_KEY = 'secret123';

    const req = { headers: { 'x-admin-key': 'secret123' }, query: {} };
    const res = createMockRes();
    const next = jest.fn();

    verifyAdminKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Memanggil next() jika ADMIN_API_KEY dikonfigurasi dan request menyertakan key valid di query admin_key', () => {
    process.env.ADMIN_API_KEY = 'secret123';

    const req = { headers: {}, query: { admin_key: 'secret123' } };
    const res = createMockRes();
    const next = jest.fn();

    verifyAdminKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
