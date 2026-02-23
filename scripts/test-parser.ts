
import * as dotenv from 'dotenv';
dotenv.config();
import { parseQuery } from '../src/lib/ai-parser';

async function test() {
    const queries = [
        "бетон м300 10 кубов с доставкой в шымкент",
        "арматура 12мм 5 тонн",
        "песок камаз",
        "газоблок 600x300 20 кубов",
        "доставка цемента"
    ];

    console.log('Testing LLM Parser...');

    for (const q of queries) {
        console.log(`\nQuery: "${q}"`);
        const start = Date.now();
        const result = await parseQuery(q);
        const time = Date.now() - start;
        console.log(`Time: ${time}ms`);
        console.log(JSON.stringify(result, null, 2));
    }
}

test();
