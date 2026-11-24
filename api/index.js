let app;
try {
  const mod = await import('../backend/dist/bundle.mjs');
  app = mod.default || mod;
} catch (err) {
  console.error('FATAL ERROR IN API/INDEX:', err);
  try {
    const { default: express } = await import('express');
    app = express();
    app.all('*', (req, res) => {
      res.status(500).json({
        error: 'API Handler Failed to Initialize',
        message: err.message,
        stack: err.stack
      });
    });
  } catch (e2) {
    app = (req, res) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Fatal API Startup Error', message: err.message, stack: err.stack }));
    };
  }
}

export default app;
