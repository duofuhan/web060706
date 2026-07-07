import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/role.js';
import { upload, imageUrlPath } from '../../middleware/upload.js';
import { success } from '../../utils/response.js';
import { itemService } from './item.service.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const data = await itemService.list(req.query);
    return success(res, data, '拍品列表');
  } catch (e) {
    next(e);
  }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    const data = await itemService.listMine(req.user!.userId, req.query);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await itemService.detail(Number(req.params.id));
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.post('/', auth, requireRole('seller'), async (req, res, next) => {
  try {
    const data = await itemService.create(req.user!.userId, req.body);
    return success(res, data, '拍品已创建');
  } catch (e) {
    next(e);
  }
});

router.put('/:id', auth, requireRole('seller'), async (req, res, next) => {
  try {
    const data = await itemService.update(Number(req.params.id), req.user!.userId, req.body);
    return success(res, data, '已更新');
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const data = await itemService.delete(Number(req.params.id), req.user!.userId, req.user!.role);
    return success(res, data, '已删除');
  } catch (e) {
    next(e);
  }
});

router.post('/:id/review', auth, requireRole('auction_admin', 'system_admin'), async (req, res, next) => {
  try {
    const data = await itemService.review(Number(req.params.id), req.body);
    return success(res, data, '审核完成');
  } catch (e) {
    next(e);
  }
});

router.post('/upload', auth, upload.array('images', 5), (req, res) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  const urls = files.map((f) => imageUrlPath(f.filename));
  return success(res, { urls }, '上传成功');
});

export default router;