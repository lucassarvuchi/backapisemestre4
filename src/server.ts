import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import visitRoutes from './routes/visits.js';
import fileRoutes from './routes/files.js';
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
console.log('🔐 authRoutes carregado');
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'visitas-api', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/files', fileRoutes);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Arquivo excede o limite permitido.' });
  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
});

connectDB().then(() => {
  app.listen(port, '0.0.0.0', () => console.log(`🚀 API REST rodando em http://localhost:${port}`));
}).catch((error) => {
  console.error('❌ Falha ao iniciar API:', error.message);
  process.exit(1);
});
