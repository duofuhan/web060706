import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import { success } from '../../utils/response.js';
import { bidService } from './bid.service.js';
import { broadcastAuction } from '../../ws/index.js';

const router = Router();

router.get('/auction/:auctionId', async (req, res, next) => {
  try {
    const data = await bidService.listByAuction(Number(req.params.auctionId));
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    const data = await bidService.myBids(req.user!.userId);
    return success(res, data);
  } catch (e) {
    next(e);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { bid, currentPrice } = await bidService.placeBid(req.user!.userId, req.body);
    broadcastAuction(bid.auctionId, {
      action: 'bid',
      auctionId: bid.auctionId,
      userId: bid.userId,
      amount: Number(bid.amount),
      currentPrice: currentPrice,
      time: bid.createdAt,
    });
    return success(res, { bidId: bid.id, currentPrice }, '出价成功');
  } catch (e) {
    next(e);
  }
});

export default router;