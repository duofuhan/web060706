import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('7d'),

  OPENAI_API_BASE: z.string().url(),
  OPENAI_API_KEY: z.string().min(10),
  OPENAI_MODEL: z.string().default('mimo-v2.5'),

  EMBEDDING_API_BASE: z.string().url(),
  EMBEDDING_API_KEY: z.string().min(10),
  EMBEDDING_MODEL: z.string().default('BAAI/bge-m3'),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1024),

  TAVILY_API_KEY: z.string().optional(),

  WX_APPID: z.string().optional(),
  WX_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ 环境变量校验失败:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;