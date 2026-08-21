import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { connectDatabase } from './db.js';
import { openApiSpec } from './docs/openapi.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import submissionRoutes from './routes/submissions.js';
import dashboardRoutes from './routes/dashboard.js';
import actionPointRoutes from './routes/actionPoints.js';
import documentRoutes from './routes/documents.js';
import reportRoutes from './routes/reports.js';
import importRoutes from './routes/imports.js';
import userRoutes from './routes/users.js';
import { getStorageStatus } from './storage/objectStore.js';
import { isMailConfigured } from './utils/mail.js';

async function start() {
  await connectDatabase();

  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'nipms-api',
      version: '0.1.0',
      environment: config.nodeEnv,
      appUrl: config.appUrl,
      storage: getStorageStatus(),
      mail: { mode: isMailConfigured() ? 'smtp' : 'console' },
    });
  });

  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'NIPMS API Documentation',
    }),
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/action-points', actionPointRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/imports', importRoutes);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  // Production: one Render service serves the Vite build and the API together,
  // so the frontend's relative `/api` calls keep working.
  if (config.nodeEnv === 'production') {
    const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(config.port, () => {
    console.log(`NIPMS API listening on http://localhost:${config.port}`);
    console.log(
      `Env=${config.nodeEnv} storage=gridfs mail=${isMailConfigured() ? 'smtp' : 'console'} appUrl=${config.appUrl}`,
    );
  });
}

start().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
