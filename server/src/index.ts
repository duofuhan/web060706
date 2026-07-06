import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { env } from './config/env.js';
import { auth } from './middleware/auth.js';
import { auditLog } from './middleware/audit.js';
import { errorHandler } from './middleware/error.js';
import userRoutes from './modules/user/user.routes.js';
import itemRoutes from './modules/item/item.routes.js';
import auctionRoutes from './modules/auction/auction.routes.js';
import bidRoutes from './modules/bid/bid.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import disputeRoutes from './modules/dispute/dispute.routes.js';
import { setupWs } from './ws/index.js';
import { startScheduler } from './ws/scheduler.js';
import { pingDb } from './db/pg.js';

async function main() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 操作审计日志 (必须放在路由前面)
  app.use(auditLog);

  app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/users', userRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/auctions', auctionRoutes);
  app.use('/api/bids', bidRoutes);
  app.use('/api/orders', auth, orderRoutes);
  app.use('/api/admin', auth, adminRoutes);
  app.use('/api/ai', auth, aiRoutes);
  app.use('/api/disputes', auth, disputeRoutes);

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use(errorHandler);

  await pingDb();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 后端已启动: http://localhost:${env.PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${env.PORT}/ws`);
  });

  setupWs(server);
  startScheduler();
}

main().catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});