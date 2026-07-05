import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { success } from '../../utils/response.js';
import { auctionService } from './auction.service.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const data = await auctionService.list(req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await auctionService.detail(Number(req.params.id));
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.post('/', auth, requireRole('seller'), async (req, res, next) => {
  try {
    const data = await auctionService.create(req.user!.userId, req.body);
    return success(res, data, '拍卖场次已创建');
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const data = await auctionService.cancel(Number(req.params.id), req.user!.userId, req.user!.role);
    return success(res, data, '已取消');
  } catch (e) {
    next(e);
  }
});

export default router;