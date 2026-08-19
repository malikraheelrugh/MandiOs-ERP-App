import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ensureDBConnected } from './config/db.js';
import { seedDatabase } from './utils/seed.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// REST APIs FIRST
app.use('/api', apiRoutes);

// Global Error Handler for API routes
app.use('/api', (err, req, res, next) => {
  console.error('REST API Error:', err);
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
    console.warn('[AI Studio] Database offline — returning fallback response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

async function startServer() {
  // Vite middleware in development mode, static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });

  // Boot operations: Seeding database asynchronously so server port 3000 opens immediately
  ensureDBConnected()
    .then(() => seedDatabase())
    .catch((err) => console.error('Error seeding database on boot:', err));
}

startServer();

