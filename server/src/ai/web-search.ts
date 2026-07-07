import { env } from '../config/env.js';

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results: SearchResult[];
  answer?: string;
}

export async function webSearch(query: string, maxResults = 5): Promise<string> {
  if (!env.TAVILY_API_KEY) return '';

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: true,
      }),
    });

    if (!res.ok) return '';

    const data: TavilyResponse = await res.json() as any;

    if (data.answer) {
      return `\n[联网搜索结果 - ${query}]\n${data.answer}`;
    }

    if (data.results?.length) {
      const snippets = data.results
        .slice(0, maxResults)
        .map((r) => `${r.title}: ${r.content}`)
        .join('\n');
      return `\n[联网搜索结果 - ${query}]\n${snippets}`;
    }

    return '';
  } catch {
    return '';
  }
}
