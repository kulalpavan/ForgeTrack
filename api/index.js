// Vercel Serverless Entry Point
// This file re-exports the Express app from the backend
// so Vercel can treat it as a serverless function.
module.exports = require('../backend/server.js');
