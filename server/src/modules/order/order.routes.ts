import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { success } from '../../utils/response.js';
import { orderService } from './order.service.js';

const router = Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const data = await orderService.list(req.user!.userId, req.user!.role, req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const data = await orderService.detail(Number(req.params.id), req.user!.userId, req.user!.role);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/pay', auth, async (req, res, next) => {
  try {
    const data = await orderService.pay(Number(req.params.id), req.user!.userId);
    return success(res, data, '支付成功');
  } catch (e) {
    next(e);
  }
});

router.post('/:id/ship', auth, async (req, res, next) => {
  try {
    const data = await orderService.ship(Number(req.params.id), req.user!.userId, req.user!.role);
    return success(res, data, '已发货');
  } catch (e) {
    next(e);
  }
});

router.post('/:id/complete', auth, async (req, res, next) => {
  try {
    const data = await orderService.complete(Number(req.params.id), req.user!.userId);
    return success(res, data, '已确认收货');
  } catch (e) {
    next(e);
  }
});

router.post('/:id/cancel', auth, async (req, res, next) => {
  try {
    const data = await orderService.cancel(Number(req.params.id), req.user!.userId, req.user!.role);
    return success(res, data, '订单已取消');
  } catch (e) {
    next(e);
  }
});

export default router;