// backend/src/utils/dateHelper.js

const MONTH_MAP = {
  'jan': '01', 'januari': '01',
  'feb': '02', 'februari': '02',
  'mar': '03', 'maret': '03',
  'apr': '04', 'april': '04',
  'mei': '05',
  'jun': '06', 'juni': '06',
  'jul': '07', 'juli': '07',
  'agu': '08', 'ags': '08', 'agustus': '08',
  'sep': '09', 'september': '09',
  'okt': '10', 'oktober': '10',
  'nov': '11', 'november': '11',
  'des': '12', 'desember': '12'
};

const DATE_PATTERNS = {
  // Capture full or 3-letter abbreviation month, time HH:mm, and optional seconds
  DATE_FULL: /(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Ags|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(\d{4}),?\s+(\d{2}:\d{2})(?::\d{2})?/i,
  DATE_NUMERIC: /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})(?::\d{2})?/,
};

/**
 * Parse Indonesian date from email body into ISO format with WIB (+07:00) offset.
 * Seconds are truncated to :00 consistently.
 * Throws an Error if format is unrecognized (fail-loud).
 * @param {string} body - Email body text
 * @returns {string} - Date string in YYYY-MM-DDTHH:mm:00+07:00 format
 */
function parseDate(body) {
  if (!body) throw new Error('Body email kosong');

  const matchFull = body.match(DATE_PATTERNS.DATE_FULL);
  if (matchFull) {
    const [, day, monthName, year, time] = matchFull;
    const month = MONTH_MAP[monthName.toLowerCase()];
    if (!month) throw new Error(`Nama bulan tidak dikenal: ${monthName}`);
    return `${year}-${month}-${day.padStart(2, '0')}T${time}:00+07:00`;
  }

  const matchNumeric = body.match(DATE_PATTERNS.DATE_NUMERIC);
  if (matchNumeric) {
    const [, day, month, year, time] = matchNumeric;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00+07:00`;
  }

  throw new Error('Format tanggal tidak ditemukan atau tidak valid');
}

module.exports = {
  parseDate,
  MONTH_MAP,
  DATE_PATTERNS
};
