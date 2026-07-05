import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { success } from '../../utils/response.js';
import { optimizeDescription, valuationAssistant } from './ai.service.js';

const router = Router();

// AI 拍品描述优化 (必做任务)
router.post('/optimize-description', auth, async (req, res, next) => {
  try {
    const data = await optimizeDescription(req.user!.userId, req.body);
    return success(res, data, 'AI 文案已生成');
  } catch (e) {
    next(e);
  }
});

// AI 价格估价助手 - RAG 多轮 (加分任务)
router.post('/valuation', auth, async (req, res, next) => {
  try {
    const data = await valuationAssistant(req.user!.userId, req.body);
    return success(res, data, '估价建议');
  } catch (e) {
    next(e);
  }
});

export default router;