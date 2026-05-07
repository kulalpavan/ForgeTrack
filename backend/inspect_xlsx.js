const XLSX = require('c:/ForgeTrack/frontend/node_modules/xlsx/xlsx.js');
const path = 'c:/ForgeTrack/Docs/Data Engineering and AI - Actual Program(3).xlsx';

try {
  const workbook = XLSX.readFile(path);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Sheet Name:', firstSheetName);
  console.log('First 5 rows:');
  data.slice(0, 5).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
} catch (e) {
  console.error('Error reading XLSX:', e.message);
}
