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

async function start() {
  await connectDatabase();

  const app = express();
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'nipms-api',
      version: '0.1.0',
      environment: config.nodeEnv,
      storage: getStorageStatus(),
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

  app.listen(config.port, () => {
    console.log(`NIPMS API listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
