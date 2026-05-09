// Vercel Serverless Entry Point
// Fix module resolution: ensure backend files can be found
// regardless of where Vercel places the function
const path = require('path');

// Set the correct working directory so all relative requires in server.js work
process.chdir(path.join(__dirname, '../backend'));

// Now require the server — all relative paths in server.js resolve from backend/
module.exports = require('../backend/server.js');
