import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { ensureDBConnected } from './config/db.js';
import { seedDatabase } from './utils/seed.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// Middleware
// --------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// Health Check
// --------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MandiOS server is running',
  });
});

// --------------------------------------------------
// API Routes
// --------------------------------------------------
app.use('/api', apiRoutes);

// Global Error Handler for API routes
app.use('/api', (err, req, res, next) => {
  console.error('REST API Error:', err);
  if (
    err.name === 'MongooseError' || 
    err.name === 'MongoNetworkError' || 
    err.name === 'DatabaseOfflineError' || 
    (err.message && err.message.includes('buffering timed out'))
  ) {
    return res.status(503).json({ 
      error: 'Database is currently unavailable. Please verify MongoDB cluster connection.',
      code: 'DATABASE_UNAVAILABLE'
    });
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// --------------------------------------------------
// Start Server & Frontend Middleware
// --------------------------------------------------
async function startServer() {
  try {
    // Mount Vite dev server in development, static files in production
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // In production, static assets are in dist directory
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    // Global Fallback Error Handler
    app.use((err, req, res, next) => {
      console.error('Server Error:', err);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`MandiOS server running on http://0.0.0.0:${PORT}`);
    });

    // Boot database connection and idempotent seed
    ensureDBConnected()
      .then(() => seedDatabase())
      .then(() => console.log('MongoDB connected and verified successfully.'))
      .catch((err) => console.error('Database connection/seed notice:', err.message || err));

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();


