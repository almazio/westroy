
import OpenAI from 'openai';
import { ParsedQuery } from './types';
import { parseQueryRegex } from './ai-parser';

let openai: OpenAI | null = null;

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

export async function parseQueryLLM(query: string): Promise<ParsedQuery> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not found, falling back to regex parser');
        return parseQueryRegex(query);
    }

    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    try {
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
        if (!content) throw new Error('Empty response from LLM');

        const result = JSON.parse(content);

        // Map to ParsedQuery interface
        return {
            category: result.category,
            categoryId: null, // LLM doesn't map to IDs yet
            volume: result.volume ? String(result.volume) : null,
            unit: result.unit,
            city: result.city,
            grade: result.grade,
            delivery: result.delivery,
            confidence: 0.95,
            suggestions: [],
            originalQuery: query,
        };

    } catch (error) {
        console.error('LLM parse error:', error);
        return parseQueryRegex(query); // Fallback
    }
}
