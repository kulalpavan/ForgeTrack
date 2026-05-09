// Vercel Serverless Entry Point
// When @vercel/node bundles this with ncc, __dirname changes.
// We pass the correct paths via environment variables set below
// BEFORE requiring server.js, so it can use them.

const path = require('path');

// Tell server.js where the frontend dist is (relative to THIS file before bundling)
// This path is resolved at BUILD time by ncc, so it must point to the actual location
process.env.FRONTEND_DIST_PATH = path.resolve(__dirname, '../frontend/dist');
process.env.BACKEND_PATH = path.resolve(__dirname, '../backend');

module.exports = require('../backend/server.js');
