import OpenAI from 'openai';
import { env } from '../config/env.js';

export const chatClient = new OpenAI({
  baseURL: env.OPENAI_API_BASE,
  apiKey: env.OPENAI_API_KEY,
});

export const embeddingClient = new OpenAI({
  baseURL: env.EMBEDDING_API_BASE,
  apiKey: env.EMBEDDING_API_KEY,
});

export async function chatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { temperature?: number; maxTokens?: number; stream?: boolean } = {},
) {
  const { temperature = 0.7, maxTokens = 1024, stream = false } = options;
  const res = await chatClient.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  } as any);
  return res;
}

export async function createEmbedding(input: string | string[]): Promise<number[][]> {
  const textArray = Array.isArray(input) ? input : [input];
  const res = await embeddingClient.embeddings.create({
    model: env.EMBEDDING_MODEL,
    input: textArray as any,
  });
  return res.data.map((d) => d.embedding);
}