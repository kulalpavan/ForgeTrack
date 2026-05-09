const { execSync } = require('child_process');

const vars = {
  MONGO_URI: 'mongodb+srv://kulalpavan338_db_user:oUSLHyUj6iTJ7v8P@cluster0.dsgxzku.mongodb.net/forgetrack?retryWrites=true&w=majority&appName=Cluster0',
  JWT_SECRET: 'forge_jwt_super_secret_2026_production',
  GEMINI_API_KEY: 'AIzaSyB7B7TewcK7Sfav-DhFgtY1v87a31T4Jls',
  NODE_ENV: 'production'
};

for (const [key, value] of Object.entries(vars)) {
  try {
    const result = execSync(`echo ${JSON.stringify(value)} | vercel env add ${key} production --force`, {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    console.log(`✅ ${key} pushed`);
  } catch(e) {
    console.error(`❌ ${key} failed:`, e.message);
  }
}
