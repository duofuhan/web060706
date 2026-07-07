import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../src/utils/password.js';
import { indexSoldItem } from '../src/modules/ai/ai.service.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

async function getUserId(username: string) {
  const u = await prisma.user.findUnique({ where: { username } });
  return u?.id;
}

async function main() {
  console.log('🌱 开始种子数据...');

  // ===== 1. 创建 4 个角色账号 =====
  const accounts: { username: string; role: UserRole; nickname: string }[] = [
    { username: 'seller01', role: 'seller', nickname: '测试卖家' },
    { username: 'buyer01', role: 'buyer', nickname: '测试买家' },
    { username: 'auction01', role: 'auction_admin', nickname: '拍卖管理员' },
    { username: 'admin01', role: 'system_admin', nickname: '系统管理员' },
  ];

  for (const a of accounts) {
    const password = hashPassword('123456');
    const exists = await prisma.user.findUnique({ where: { username: a.username } });
    if (exists) {
      console.log(`  - ${a.username} 已存在,跳过`);
      continue;
    }
    await prisma.user.create({ data: { username: a.username, password, role: a.role, nickname: a.nickname } });
    console.log(`  + ${a.username} (${a.role}) 密码 123456`);
  }
  const sellerId = await getUserId('seller01');
  const buyerId = await getUserId('buyer01');
  if (!sellerId || !buyerId) throw new Error('用户创建失败');

  // ===== 2. 创建系统配置 =====
  const configs = [
    { key: 'auction_duration_max', value: '72', description: '拍卖最长时长(小时)' },
    { key: 'bid_min_increment', value: '50', description: '最低加价幅度(元)' },
    { key: 'deposit_rate', value: '0.1', description: '保证金比例' },
    { key: 'service_fee_rate', value: '0.05', description: '服务费比例' },
  ];
  for (const c of configs) {
    const exists = await prisma.systemConfig.findUnique({ where: { key: c.key } });
    if (exists) continue;
    await prisma.systemConfig.create({ data: c });
    console.log(`  + config ${c.key} = ${c.value}`);
  }

  // ===== 3. 创建示例拍品 =====
  const sampleItems = [
    { name: 'iPhone 15 Pro 256GB', category: '数码', condition: '95新', originPrice: 8999, startPrice: 5000, description: '深黑色，外观完好，屏幕无划痕，电池健康度92%，带原装盒', status: 'approved' as const },
    { name: 'MacBook Air M3 16GB', category: '数码', condition: '全新', originPrice: 10999, startPrice: 8000, description: '未拆封，2025年款，星光色，16GB+512GB', status: 'pending' as const },
    { name: '索尼 A7M4 相机机身', category: '数码', condition: '9成新', originPrice: 16999, startPrice: 10000, description: '快门数约5000次，原装配件齐全，送备用电池', status: 'approved' as const },
    { name: 'LV Neverfull 中号手袋', category: '奢侈品', condition: '95新', originPrice: 14800, startPrice: 8000, description: '经典老花，购于专柜，使用次数极少，附带防尘袋', status: 'draft' as const },
    { name: '戴森 V15 无线吸尘器', category: '家电', condition: '9成新', originPrice: 4990, startPrice: 2000, description: '强力模式续航30分钟，全部吸头齐全', status: 'rejected' as const },
  ];

  for (const item of sampleItems) {
    const exists = await prisma.item.findFirst({ where: { name: item.name, sellerId } });
    if (exists) continue;
    await prisma.item.create({
      data: {
        sellerId,
        name: item.name,
        category: item.category,
        condition: item.condition,
        originPrice: item.originPrice,
        startPrice: item.startPrice,
        description: item.description,
        status: item.status,
        images: [],
      },
    });
    console.log(`  + item "${item.name}" [${item.status}]`);
  }

  // ===== 4. 创建已审核拍品的拍卖场次（已结束） =====
  const approvedItem = await prisma.item.findFirst({ where: { sellerId, status: 'approved', auction: null } });
  if (approvedItem) {
    const pastEnd = new Date(Date.now() - 1000 * 60 * 60);
    const existingAuc = await prisma.auction.findUnique({ where: { itemId: approvedItem.id } });
    if (!existingAuc) {
      const auction = await prisma.auction.create({
        data: {
          sellerId,
          itemId: approvedItem.id,
          type: 'ascending',
          status: 'ended',
          startPrice: approvedItem.startPrice,
          currentPrice: approvedItem.startPrice,
          minIncrement: 50,
          startTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
          endTime: pastEnd,
        },
      });
      console.log(`  + auction #${auction.id} (ended, ready for settlement)`);

      // 添加示例出价
      const existingBids = await prisma.bid.count({ where: { auctionId: auction.id } });
      if (existingBids === 0) {
        await prisma.bid.createMany({
          data: [
            { auctionId: auction.id, userId: buyerId, amount: 5500, status: 'outbid', isMax: false },
            { auctionId: auction.id, userId: buyerId, amount: 5800, status: 'winning', isMax: true },
          ],
        });
        await prisma.auction.update({
          where: { id: auction.id },
          data: { currentPrice: 5800, winnerId: buyerId, status: 'settled' },
        });
        console.log('  + bids created, auction settled');

        // 创建订单
        const existingOrder = await prisma.order.findUnique({ where: { auctionId: auction.id } });
        if (!existingOrder) {
          const order = await prisma.order.create({
            data: {
              auctionId: auction.id,
              buyerId,
              finalPrice: 5800,
              status: 'paid',
              paymentTime: new Date(Date.now() - 1000 * 60 * 30),
            },
          });
          console.log(`  + order #${order.id} (paid)`);
          await indexSoldItem({
            itemId: auction.itemId,
            name: approvedItem.name,
            category: approvedItem.category,
            condition: approvedItem.condition,
            finalPrice: 5800,
            soldAt: new Date(),
          }).catch((e) => console.error('  ⚠️ 向量写入失败:', e.message));
        }
      }
    }
  }

  console.log('✅ 种子完成');
  console.log('');
  console.log('测试账号:');
  console.log('  卖家 seller01 / 123456');
  console.log('  买家 buyer01 / 123456');
  console.log('  拍卖管理员 auction01 / 123456');
  console.log('  系统管理员 admin01 / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });