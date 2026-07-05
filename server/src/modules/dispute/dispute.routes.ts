import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { success } from '../../utils/response.js';
import { disputeService } from './dispute.service.js';

const router = Router();

// 买家/卖家 发起争议
router.post('/', auth, requireRole('buyer', 'seller'), async (req, res, next) => {
  try {
    const data = await disputeService.create(req.user!.userId, req.body);
    return success(res, data, '争议已提交');
  } catch (e) {
    next(e);
  }
});

// 列表: 自己作为发起人 或 拍卖/系统管理员可看全部
router.get('/', auth, async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (!['auction_admin', 'system_admin'].includes(role)) {
      const all = await disputeService.list({ page: 1, pageSize: 50 });
      const mine = all.list.filter((d: any) => d.openedBy === req.user!.userId);
      return success(res, { list: mine, total: mine.length, page: 1, pageSize: 50 });
    }
    const data = await disputeService.list(req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const data = await disputeService.detail(Number(req.params.id));
    const role = req.user!.role;
    const isOpenedByMe = data.openedBy === req.user!.userId;
    if (!isOpenedByMe && !['auction_admin', 'system_admin'].includes(role)) {
      return next(new (require('../../utils/error.js').AppError)('无权查看他人争议', 403, 403));
    }
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

// 拍卖管理员接单
router.post('/:id/take', auth, requireRole('auction_admin', 'system_admin'), async (req, res, next) => {
  try {
    const data = await disputeService.take(Number(req.params.id), req.user!.userId);
    return success(res, data, '已受理');
  } catch (e) {
    next(e);
  }
});

// 拍卖管理员处理完毕
router.post('/:id/resolve', auth, requireRole('auction_admin', 'system_admin'), async (req, res, next) => {
  try {
    const data = await disputeService.resolve(Number(req.params.id), req.user!.userId, req.body);
    return success(res, data, '已处理');
  } catch (e) {
    next(e);
  }
});

export default router;