import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../utils/jwt.js';
import { redis } from '../db/redis.js';
import { bidService } from '../modules/bid/bid.service.js';

interface BidMessage {
  action: 'subscribe' | 'bid' | 'ping';
  auctionId?: number;
  amount?: number;
}

export const auctionSubscribers = new Map<number, Set<WebSocket>>();

export function broadcastAuction(auctionId: number, payload: unknown) {
  const subs = auctionSubscribers.get(auctionId);
  if (!subs) return;
  const msg = JSON.stringify(payload);
  subs.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

export function setupWs(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');
    let userId: number | null = null;
    let subscribedAuction: number | null = null;

    if (token) {
      try {
        const payload = verifyToken(token);
        userId = payload.userId;
      } catch {
        ws.close(4001, 'token 无效');
        return;
      }
    }

    ws.on('message', async (raw) => {
      let msg: BidMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return ws.send(JSON.stringify({ action: 'error', message: '消息格式错误' }));
      }

      switch (msg.action) {
        case 'subscribe': {
          if (msg.auctionId == null) return;
          subscribedAuction = msg.auctionId;
          if (!auctionSubscribers.has(subscribedAuction)) auctionSubscribers.set(subscribedAuction, new Set());
          auctionSubscribers.get(subscribedAuction)!.add(ws);
          await redis.sadd(`auction:${subscribedAuction}:online`, String(userId ?? 'anon'));
          ws.send(JSON.stringify({ action: 'subscribed', auctionId: subscribedAuction }));
          break;
        }
        case 'bid': {
          if (!userId) return ws.send(JSON.stringify({ action: 'error', message: '请先登录' }));
          if (!subscribedAuction || msg.auctionId !== subscribedAuction) {
            return ws.send(JSON.stringify({ action: 'error', message: '请先订阅该场次' }));
          }
          try {
            const { bid, currentPrice } = await bidService.placeBid(userId, {
              auctionId: subscribedAuction,
              amount: msg.amount,
            });
            broadcastAuction(subscribedAuction, {
              action: 'bid',
              auctionId: subscribedAuction,
              userId,
              amount: Number(bid.amount),
              currentPrice,
              time: bid.createdAt,
            });
          } catch (e: any) {
            ws.send(JSON.stringify({ action: 'error', message: e.message ?? '出价失败' }));
          }
          break;
        }
        case 'ping':
          ws.send(JSON.stringify({ action: 'pong' }));
          break;
      }
    });

    ws.on('close', async () => {
      if (subscribedAuction) {
        const subs = auctionSubscribers.get(subscribedAuction);
        subs?.delete(ws);
        if (subs?.size === 0) auctionSubscribers.delete(subscribedAuction);
        if (userId) await redis.srem(`auction:${subscribedAuction}:online`, String(userId));
      }
    });
  });
}