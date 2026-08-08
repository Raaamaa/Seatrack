// backend/server.js
require('dotenv').config();
const app = require('./src/app');
const { getAuthClient } = require('./src/config/googleAuth');
const { initializeSheets } = require('./src/services/sheetsService');
const { startScheduler } = require('./src/services/schedulerService');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || adminKey.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL ERROR: ADMIN_API_KEY belum dikonfigurasi di environment production!');
      process.exit(1);
    } else {
      console.warn('⚠️  PERINGATAN KEAMANAN: ADMIN_API_KEY belum dikonfigurasi di .env!');
      console.warn('💡 Endpoint admin (/api/auth/url) akan mengembalikan HTTP 500 hingga ADMIN_API_KEY diset.');
    }
  }

  try {
    console.log('🚀 Menginisialisasi SeaTrack Backend...');
    const auth = await getAuthClient();
    await initializeSheets(auth);
    startScheduler();

    app.listen(PORT, () => {
      console.log(`✅ Server berjalan di http://localhost:${PORT}`);
      console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Gagal menjalankan server:', error.message);
    console.log('💡 Catatan: Jika ini kegagalan autentikasi Google API, pastikan credentials.json sudah ada di folder backend/credentials/');
    // Start Express anyway so developer can debug or manual endpoint is running
    app.listen(PORT, () => {
      console.log(`⚠️  Server berjalan dengan fitur Google API NON-AKTIF di http://localhost:${PORT}`);
    });
  }
}

bootstrap();
