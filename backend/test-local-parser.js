const readline = require('readline');
const { parseSeaBankEmail } = require('./src/services/parserService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== SEATRACK LOCAL EMAIL PARSER TESTER ===');
console.log('Gunakan alat ini untuk menguji parsing dari email SeaBank asli.\n');

rl.question('1. Masukkan Subject Email: ', (subject) => {
  console.log('\n2. Masukkan Body Email (tempel teks email Anda, lalu tekan Enter):');
  
  let bodyLines = [];
  rl.on('line', (line) => {
    // Berhenti jika mendeteksi baris kosong setelah input teks
    if (line.trim() === '' && bodyLines.length > 0) {
      const body = bodyLines.join('\n');
      console.log('\n--- Hasil Parsing ---');
      const emailData = {
        id: 'test-local-' + Date.now(),
        subject: subject,
        body: body
      };
      
      const result = parseSeaBankEmail(emailData);
      if (result) {
        console.log(JSON.stringify(result, null, 2));
        console.log('\n✅ Sukses! Hasil di atas adalah representasi objek transaksi Anda.');
      } else {
        console.log('❌ Gagal melakukan parsing! Format nominal atau struktur email tidak sesuai dengan regex.');
      }
      rl.close();
    } else {
      bodyLines.push(line);
    }
  });
});
