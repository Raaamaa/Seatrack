// backend/server.js
require('dotenv').config();
const app = require('./src/app');
const { getAuthClient } = require('./src/config/googleAuth');
const { initializeSheets } = require('./src/services/sheetsService');
const { startScheduler } = require('./src/services/schedulerService');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
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
