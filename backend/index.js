let app;
try {
  const mod = require('./dist/index.js');
  app = mod.default || mod;
} catch (err) {
  console.error('FATAL ERROR IN BACKEND/INDEX:', err);
  try {
    const express = require('express');
    app = express();
    app.all('*', (req, res) => {
      res.status(500).json({
        error: 'Backend Index Failed to Initialize',
        message: err.message,
        stack: err.stack
      });
    });
  } catch (e2) {
    app = (req, res) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Fatal Startup Error', message: err.message, stack: err.stack }));
    };
  }
}

module.exports = app;
module.exports.default = app;
