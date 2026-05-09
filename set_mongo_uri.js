const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MONGO_URI = 'mongodb+srv://kulalpavan338_db_user:oUSLHyUj6iTJ7v8P@cluster0.dsgxzku.mongodb.net/forgetrack?retryWrites=true&w=majority&appName=Cluster0';

// Write to temp file to avoid shell escaping issues completely
const tmpFile = path.join(__dirname, '_mongo_uri.txt');
fs.writeFileSync(tmpFile, MONGO_URI);

try {
  // Use type (Windows) to pipe the file contents - no shell interpolation of the value
  const result = execSync(`type _mongo_uri.txt | vercel env add MONGO_URI production --force`, {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('✅ MONGO_URI set successfully');
  console.log(result);
} catch(e) {
  console.error('❌ Failed:', e.stdout || e.message);
} finally {
  fs.unlinkSync(tmpFile);
}
