import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { success } from '../../utils/response.js';
import { optimizeDescription, valuationSearch, valuationAssistant, valuationStream } from './ai.service.js';

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

// AI 估价 - 第一步: 联网搜索
router.post('/valuation-search', auth, async (req, res, next) => {
  try {
    const data = await valuationSearch(req.user!.userId, req.body);
    return success(res, data, '搜索完成');
  } catch (e) {
    next(e);
  }
});

// AI 估价 - 流式生成
router.post('/valuation-stream', auth, async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let done = false;

    valuationStream(
      req.user!.userId,
      req.body,
      (text) => {
        if (!done) res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      },
      (reply, sessionId) => {
        if (!done) {
          done = true;
          res.write(`data: ${JSON.stringify({ type: 'done', reply, sessionId })}\n\n`);
          res.end();
        }
      },
      (err) => {
        if (!done) {
          done = true;
          res.write(`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`);
          res.end();
        }
      },
    );

    req.on('close', () => { done = true; });
  } catch (e) {
    next(e);
  }
});

// AI 价格估价助手 - 第二步: AI 生成 (RAG 多轮)
router.post('/valuation', auth, async (req, res, next) => {
  try {
    const data = await valuationAssistant(req.user!.userId, req.body);
    return success(res, data, '估价建议');
  } catch (e) {
    next(e);
  }
});

export default router;