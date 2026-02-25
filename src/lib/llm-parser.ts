import OpenAI from 'openai';
import { ParsedQuery } from './types';
import { parseQueryRegex } from './ai-parser';
import { parseConstructionRequest } from './ai/gemini';

let openai: OpenAI | null = null;
let deepseek: OpenAI | null = null;

const SYSTEM_PROMPT = `
You are a parser for a construction marketplace search. 
Extract structured data from the user's natural language search query.
Return JSON only.

Rules:
1. Category: Identify the main material or service (e.g., "Бетон", "Арматура", "Песок"). 
   If unclear, use null.
2. Volume: Extract the numeric quantity.
3. Unit: Extract the unit of measure (e.g., "м3", "тонн", "шт", "смен"). Normalize to: 'м3', 'т', 'шт', 'рейс', 'час', 'смена'.
4. City: Detect city names (e.g. "Шымкент", "Туркестан"). Default to "Шымкент" if not specified but query implies local search.
5. Grade/Type: Extract specific markers like "М300" for concrete, "A500C" for rebar, "мытый" for sand.

Output Schema:
{
  "category": string | null,
  "volume": number | null,
  "unit": string | null,
  "city": string | null,
  "grade": string | null,
  "delivery": boolean
}

Examples:
"бетон м300 20 кубов с доставкой" -> {"category": "Бетон", "volume": 20, "unit": "м3", "city": "Шымкент", "grade": "М300", "delivery": true}
"песок камаз" -> {"category": "Песок", "volume": null, "unit": "рейс", "city": "Шымкент", "grade": null, "delivery": true}
`;

function extractJsonObject(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch?.[1]) {
        const inner = codeBlockMatch[1].trim();
        if (inner.startsWith('{') && inner.endsWith('}')) return inner;
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
        return trimmed.slice(start, end + 1);
    }

    throw new Error('No JSON object found in LLM response');
}

function mergeWithRegexFallback(query: string, llmResult: Partial<ParsedQuery>): ParsedQuery {
    const regexResult = parseQueryRegex(query);
    return {
        category: llmResult.category ?? regexResult.category,
        categoryId: llmResult.categoryId ?? regexResult.categoryId,
        volume: llmResult.volume ?? regexResult.volume,
        unit: llmResult.unit ?? regexResult.unit,
        city: llmResult.city ?? regexResult.city,
        delivery: llmResult.delivery ?? regexResult.delivery,
        grade: llmResult.grade ?? regexResult.grade,
        confidence: llmResult.confidence ?? 0.95,
        suggestions: llmResult.suggestions ?? (llmResult.categoryId ? [] : regexResult.suggestions),
        originalQuery: query,
    };
}

async function parseWithGemini(query: string): Promise<ParsedQuery> {
    const result = await parseConstructionRequest(query);
    if (!result) {
        throw new Error('Empty or invalid response from Gemini SDK');
    }

    return mergeWithRegexFallback(query, {
        category: result.category,
        categoryId: null,
        volume: result.volume ? String(result.volume) : null,
        unit: result.unit,
        city: result.location,
        grade: result.productType,
        delivery: result.delivery,
        confidence: 0.95,
        suggestions: [],
    });
}

async function parseWithOpenAI(query: string): Promise<ParsedQuery> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query }
        ],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const result = JSON.parse(extractJsonObject(content));

    return mergeWithRegexFallback(query, {
        category: result.category,
        categoryId: null,
        volume: result.volume ? String(result.volume) : null,
        unit: result.unit,
        city: result.city,
        grade: result.grade,
        delivery: result.delivery,
        confidence: 0.95,
        suggestions: [],
    });
}

async function parseWithDeepSeek(query: string): Promise<ParsedQuery> {
    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DEEPSEEK_API_KEY not configured');
    }

    if (!deepseek) {
        deepseek = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        });
    }

    const completion = await deepseek.chat.completions.create({
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: query },
        ],
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from DeepSeek');

    const result = JSON.parse(extractJsonObject(content));

    return mergeWithRegexFallback(query, {
        category: result.category,
        categoryId: null,
        volume: result.volume ? String(result.volume) : null,
        unit: result.unit,
        city: result.city,
        grade: result.grade,
        delivery: result.delivery,
        confidence: 0.95,
        suggestions: [],
    });
}

export async function parseQueryLLM(query: string): Promise<ParsedQuery> {
    const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

    if (!hasDeepSeek && !hasGemini && !hasOpenAI) {
        console.warn('No LLM key configured (DEEPSEEK_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY), falling back to regex parser');
        return parseQueryRegex(query);
    }

    if (!openai) {
        openai = hasOpenAI
            ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            : null;
    }

    try {
        if (hasGemini) {
            return await parseWithGemini(query);
        }
        if (hasDeepSeek) {
            return await parseWithDeepSeek(query);
        }
        return await parseWithOpenAI(query);
    } catch (error) {
        console.error('LLM parse error:', error);
        return parseQueryRegex(query); // Fallback
    }
}
