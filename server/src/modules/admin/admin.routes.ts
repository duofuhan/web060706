import { Router } from 'express';
import { requireRole } from '../../middleware/role.js';
import { success } from '../../utils/response.js';
import { adminService } from './admin.service.js';
import { auctionService } from '../auction/auction.service.js';
import { prisma } from '../../db/prisma.js';
import { z } from 'zod';

const router = Router();

router.get('/stats', requireRole('auction_admin', 'system_admin'), async (_req, res, next) => {
  try {
    const data = await adminService.stats();
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/users', requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = await adminService.listUsers(req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.post('/users', requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = await adminService.createUser(req.body);
    return success(res, data, '用户已创建');
  } catch (e) {
    next(e);
  }
});

router.put('/users/:id', requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = await adminService.updateUser(Number(req.params.id), req.body);
    return success(res, data, '已更新');
  } catch (e) {
    next(e);
  }
});

router.delete('/users/:id', requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = await adminService.deleteUser(Number(req.params.id));
    return success(res, data, '已禁用');
  } catch (e) {
    next(e);
  }
});

router.get('/items/pending', requireRole('auction_admin', 'system_admin'), async (_req, res, next) => {
  try {
    const data = await adminService.pendingItems();
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/auctions', requireRole('auction_admin', 'system_admin'), async (req, res, next) => {
  try {
    const data = await adminService.listAuctions(req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/logs', requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = await adminService.logs(req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

// 拍卖管理员强制结束拍卖
router.post('/auctions/:id/force-end', requireRole('auction_admin', 'system_admin'), async (req, res, next) => {
  try {
    const data = await auctionService.forceEnd(Number(req.params.id), req.user!.userId);
    return success(res, data, '已强制结束');
  } catch (e) {
    next(e);
  }
});

// 拍卖管理员强制取消拍卖
router.post('/auctions/:id/force-cancel', requireRole('auction_admin', 'system_admin'), async (req, res, next) => {
  try {
    const reasonSchema = z.object({ reason: z.string().min(1).max(200) });
    const { reason } = reasonSchema.parse(req.body);
    const data = await auctionService.forceCancel(Number(req.params.id), req.user!.userId, reason);
    return success(res, data, '已强制取消');
  } catch (e) {
    next(e);
  }
});

// 系统配置: 列表
router.get('/config', requireRole('system_admin'), async (_req, res, next) => {
  try {
    const data = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

// 系统配置: 更新
router.put('/config/:key', requireRole('system_admin'), async (req, res, next) => {
  try {
    const schema = z.object({ value: z.string() });
    const { value } = schema.parse(req.body);
    const data = await prisma.systemConfig.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value },
      update: { value },
    });
    return success(res, data, '配置已保存');
  } catch (e) {
    next(e);
  }
});

export default router;