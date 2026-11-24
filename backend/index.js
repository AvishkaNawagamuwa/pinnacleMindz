// Pinnacle Mindz Backend Vercel Entrypoint
let app;
let startupError = null;

try {
  const bundle = require('./dist/bundle.cjs');
  app = bundle.default || bundle;
} catch (err) {
  startupError = err;
  console.error('FATAL BACKEND STARTUP ERROR:', err);
}

const handler = (req, res) => {
  if (startupError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'Backend initialization failed',
      message: startupError?.message,
      stack: startupError?.stack,
      code: startupError?.code
    }, null, 2));
  }
  return app(req, res);
};

module.exports = handler;
module.exports.default = handler;
