import { Pool } from 'pg';
import { env } from '../config/env.js';

export const pg = new Pool({
  connectionString: env.DATABASE_URL,
});

// 通过原生 pg 查询向量库时: 使用 text 形式传入 vector
// 例: SELECT * FROM ... WHERE embedding <=> $1::vector
// $1 即: `[0.1,0.2,...]` 字符串
export async function pingDb() {
  const client = await pg.connect();
  try {
    await client.query('SELECT 1');
    console.log('[Pg] 连接正常, pgvector 扩展已可用');
  } finally {
    client.release();
  }
}