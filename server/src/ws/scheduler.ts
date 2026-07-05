import { auctionService } from '../modules/auction/auction.service.js';

let timer: NodeJS.Timeout | null = null;

export function startScheduler() {
  timer = setInterval(async () => {
    try {
      const started = await auctionService.startScheduledAuctions();
      const ended = await auctionService.endExpiredAuctions();
      if (started > 0 || ended > 0) {
        console.log(`[Scheduler] 启动 ${started} 场, 结束 ${ended} 场`);
      }
    } catch (e) {
      console.error('[Scheduler] 错误', e);
    }
  }, 10_000);
  console.log('[Scheduler] 拍卖状态定时器已启动 (10s/次)');
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
}