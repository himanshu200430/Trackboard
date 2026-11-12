
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import cardRoutes from './routes/cards.js';
import labelRoutes from './routes/labels.js';
import aiRoutes from './routes/ai.js';
import commentsRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import taskRoutes from './routes/tasks.js';
import fileRoutes from './routes/files.js';
import memberRoutes from './routes/members.js';
import pool from './config/db.js';

// Load environment variables for local development
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
      );
    }
  });

  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Tackboard API',
    status: 'running',
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      service: 'Tackboard API',
      database: 'connected',
    });
  } catch (err) {
    console.error('Database health check failed:', err.message);

    res.status(500).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/cards', commentsRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/members', memberRoutes);

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found.',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.',
  });
});

// Local development server only
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Tackboard Backend running on http://localhost:${PORT}`);
    console.log(`Allowed Client: ${CLIENT_URL}`);
  });
}

// Export Express app for Vercel
export default app;
