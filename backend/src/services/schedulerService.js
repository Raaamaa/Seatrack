// backend/src/services/schedulerService.js
const cron = require('node-cron');
const { getAuthClient } = require('../config/googleAuth');
const { fetchNewTransactionEmails } = require('./gmailService');
const { getProcessedEmailIds, saveTransactions } = require('./sheetsService');
require('dotenv').config();

const INTERVAL = process.env.POLLING_INTERVAL_MINUTES || 5;

async function runEmailSync() {
  console.log(`[Scheduler] Memulai sinkronisasi email... ${new Date().toLocaleTimeString('id-ID')}`);
  try {
    const auth = await getAuthClient();
    const processedIds = await getProcessedEmailIds(auth);
    const newTransactions = await fetchNewTransactionEmails(auth, processedIds);
    if (newTransactions.length > 0) {
      await saveTransactions(auth, newTransactions);
      console.log(`[Scheduler] ✅ ${newTransactions.length} transaksi baru tersimpan.`);
    } else {
      console.log('[Scheduler] Tidak ada transaksi baru untuk disinkronkan.');
    }
  } catch (error) {
    console.error('[Scheduler] ❌ Error sinkronisasi:', error.message);
  }
}

function startScheduler() {
  // Jalankan sekali saat startup
  runEmailSync();
  // Jadwalkan setiap N menit
  cron.schedule(`*/${INTERVAL} * * * *`, runEmailSync);
  console.log(`[Scheduler] Polling aktif setiap ${INTERVAL} menit.`);
}

module.exports = { startScheduler, runEmailSync };
