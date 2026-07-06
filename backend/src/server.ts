import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';
import { closeDatabaseConnection, getDb } from './db/index.js';
import { settingsRepository } from './repositories/settings.repository.js';
import { adminRepository } from './repositories/admin.repository.js';

const app = express();

// ====================================================================
// Security Middleware
// ====================================================================
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = config.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (!origin || allowed.includes(origin) || config.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

// Rate limiting — global
const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});

// Stricter rate limit for scratch endpoint
const scratchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.body?.phone || req.ip || '',
  message: { success: false, error: 'Too many scratch attempts. Please try again later.', code: 'RATE_LIMITED' },
});

app.use(globalLimiter);
app.use('/api/v1/users/scratch', scratchLimiter);

// ====================================================================
// Parsing
// ====================================================================
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ====================================================================
// Logging
// ====================================================================
if (config.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );
}

// ====================================================================
// Trust proxy (for accurate IP behind Render/Vercel)
// ====================================================================
app.set('trust proxy', 1);

// ====================================================================
// Routes
// ====================================================================
app.use('/api/v1', routes);

// ====================================================================
// 404 + Error Handlers
// ====================================================================
app.use(notFoundHandler);
app.use(errorHandler);

// ====================================================================
// Startup
// ====================================================================
async function bootstrap() {
  // Initialize DB connection
  getDb();

  // ----------------------------------------------------------------
  // Data seeding — ONLY runs when SEED_DATA=true in .env
  // ----------------------------------------------------------------
  if (config.SEED_DATA === 'true') {
    logger.info('SEED_DATA=true — seeding defaults...');

    // Seed default settings (key-value config rows)
    await settingsRepository.seedDefaults();

    // Seed superadmin if credentials are configured
    if (config.ADMIN_SEED_EMAIL && config.ADMIN_SEED_PASSWORD) {
      const exists = await adminRepository.findByEmail(config.ADMIN_SEED_EMAIL);
      if (!exists) {
        await adminRepository.create({
          name: 'Super Admin',
          email: config.ADMIN_SEED_EMAIL,
          password: config.ADMIN_SEED_PASSWORD,
          role: 'superadmin',
        });
        logger.info(`Superadmin created: ${config.ADMIN_SEED_EMAIL}`);
      } else {
        logger.info(`Superadmin already exists: ${config.ADMIN_SEED_EMAIL} — skipped`);
      }
    } else {
      logger.warn('SEED_DATA=true but ADMIN_SEED_EMAIL/PASSWORD not set — skipping admin seed');
    }
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Server running on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // Graceful shutdown
  const graceful = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await closeDatabaseConnection();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => graceful('SIGTERM'));
  process.on('SIGINT', () => graceful('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
