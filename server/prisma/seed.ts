import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../src/utils/password.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

async function main() {
  console.log('🌱 开始种子数据...');

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

  console.log('✅ 种子完成');
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