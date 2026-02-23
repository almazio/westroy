// ============================================
// WESTROY — AI Query Parser (Robust Keyword NLP)
// ============================================
// Extracts: category, volume, unit, city, delivery, grade
// With: synonym dictionaries, fuzzy matching, unit normalization, confidence scoring

import { ParsedQuery, Suggestion } from './types';
import { parseQueryLLM } from './llm-parser';

export type { ParsedQuery, Suggestion };

// ---- SYNONYM DICTIONARIES ----

const CATEGORY_SYNONYMS: Record<string, { id: string; label: string; keywords: string[] }> = {
    concrete: {
        id: 'concrete',
        label: 'Бетон',
        keywords: ['бетон', 'бетона', 'бетону', 'бетоном', 'раствор', 'раствора', 'товарный бетон'],
    },
    aggregates: {
        id: 'aggregates',
        label: 'Инертные материалы',
        keywords: ['песок', 'песка', 'щебень', 'щебня', 'гравий', 'гравия', 'отсев', 'пгс', 'инертные', 'инертных', 'инертный'],
    },
    blocks: {
        id: 'blocks',
        label: 'Кирпич и блоки',
        keywords: ['кирпич', 'кирпича', 'газоблок', 'газоблока', 'пеноблок', 'пеноблока', 'блок', 'блоки', 'блоков',
            'газобетон', 'газобетона', 'пенобетон', 'шлакоблок', 'керамзитоблок'],
    },
    rebar: {
        id: 'rebar',
        label: 'Арматура и металлопрокат',
        keywords: ['арматура', 'арматуры', 'арматуру', 'металл', 'металла', 'прокат', 'проката', 'металлопрокат',
            'швеллер', 'швеллера', 'уголок', 'уголка', 'труба', 'трубу', 'трубы', 'лист', 'балка', 'сетка', 'сетки'],
    },
    cement: {
        id: 'cement',
        label: 'Цемент',
        keywords: ['цемент', 'цемента', 'портландцемент', 'пц400', 'пц500', 'м400', 'м500'],
    },
    machinery: {
        id: 'machinery',
        label: 'Спецтехника',
        keywords: ['спецтехника', 'спецтехнику', 'спецтехники', 'экскаватор', 'экскаватора', 'кран', 'крана',
            'бульдозер', 'бульдозера', 'погрузчик', 'погрузчика', 'автокран', 'автокрана',
            'миксер', 'миксера', 'самосвал', 'самосвала', 'техника', 'техники', 'аренда техники'],
    },
    'pvc-profiles': {
        id: 'pvc-profiles',
        label: 'ПВХ профили и подоконники',
        keywords: ['пвх', 'подоконник', 'подоконники', 'профиль', 'профили', 'ламбри', 'штапик', 'оконный профиль', 'дверной профиль'],
    },
    'general-materials': {
        id: 'general-materials',
        label: 'Общестроительные материалы',
        keywords: ['осп', 'фанера', 'двп', 'дсп', 'гипсокартон', 'ламинат', 'керамогранит', 'утеплитель', 'штукатурка', 'кафельный клей', 'рубероид', 'труба', 'муфта'],
    },
    'painting-tools': {
        id: 'painting-tools',
        label: 'Малярный инструмент',
        keywords: ['валик', 'кисть', 'шпатель', 'кельма', 'терка', 'малярный инструмент'],
    },
    'hand-tools': {
        id: 'hand-tools',
        label: 'Ручной инструмент',
        keywords: ['молоток', 'рулетка', 'уровень', 'отвертка', 'ножовка', 'плоскогубцы', 'инструмент'],
    },
    fasteners: {
        id: 'fasteners',
        label: 'Крепеж и метизы',
        keywords: ['саморез', 'дюбель', 'гвоздь', 'болт', 'гайка', 'анкер', 'шуруп', 'метизы'],
    },
    electrical: {
        id: 'electrical',
        label: 'Электрика',
        keywords: ['кабель', 'провод', 'розетка', 'выключатель', 'лампа', 'автомат', 'электрика'],
    },
    plumbing: {
        id: 'plumbing',
        label: 'Сантехника и трубы',
        keywords: ['сантехника', 'труба', 'фитинг', 'кран', 'смеситель', 'муфта'],
    },
    safety: {
        id: 'safety',
        label: 'СИЗ и безопасность',
        keywords: ['перчатки', 'очки', 'каска', 'респиратор', 'маска', 'сиз'],
    },
    'adhesives-sealants': {
        id: 'adhesives-sealants',
        label: 'Клеи и герметики',
        keywords: ['клей', 'герметик', 'монтажная пена', 'силикон', 'эпоксидный'],
    },
};

// Grade patterns (бетон/concrete specific)
const GRADE_PATTERNS = [
    /м[\s\-]?(\d{2,3})/i,          // м300, м-300, м 300
    /m[\s\-]?(\d{2,3})/i,          // M300, m300
    /марк[аиуе]\s*(\d{2,3})/i,     // марка 300, марки 300
    /b[\s\-]?(\d{1,2}\.?\d?)/i,    // B22.5, b15
    /класс\s*b?\s*(\d{1,2}\.?\d?)/i, // класс B22.5
];

// Volume + Unit patterns
const VOLUME_PATTERNS = [
    // кубов, кубометров, м3, куб
    { regex: /(\d+[\.,]?\d*)\s*(куб(?:ов|ометр(?:ов)?|а)?|м3|м³|кубов|кубометров)/i, unit: 'м³' },
    // тонн
    { regex: /(\d+[\.,]?\d*)\s*(тонн(?:а|у|ы)?|т(?:\s|$)|тн)/i, unit: 'тонн' },
    // штук
    { regex: /(\d+[\.,]?\d*)\s*(шт(?:ук(?:а|и)?)?|штуки?)/i, unit: 'шт' },
    // часов
    { regex: /(\d+[\.,]?\d*)\s*(час(?:ов|а)?|ч(?:\s|$))/i, unit: 'час' },
    // смен
    { regex: /(\d+[\.,]?\d*)\s*(смен(?:а|у|ы)?)/i, unit: 'смена' },
    // рейсов
    { regex: /(\d+[\.,]?\d*)\s*(рейс(?:ов|а)?)/i, unit: 'рейс' },
    // Just a number (context-dependent)
    { regex: /(\d+[\.,]?\d*)\s*$/i, unit: null },
];

// City synonyms
const CITY_SYNONYMS: Record<string, string> = {
    'шымкент': 'Шымкент',
    'шым': 'Шымкент',
    'шимкент': 'Шымкент',
    'чимкент': 'Шымкент',
    'шымкенте': 'Шымкент',
    'шымкента': 'Шымкент',
    'шымкенту': 'Шымкент',
    'город': 'Шымкент', // Default
    'туркестан': 'Туркестан',
    'туркестане': 'Туркестан',
};

// Delivery keywords
const DELIVERY_KEYWORDS = [
    'доставка', 'доставкой', 'доставку', 'доставить', 'довезти', 'привезти', 'привезите',
    'с доставкой', 'нужна доставка', 'доставьте',
];

// ---- FUZZY MATCHING ----

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function fuzzyMatch(word: string, target: string, maxDistance: number = 2): boolean {
    if (word.length < 3) return word === target;
    if (target.includes(word) || word.includes(target)) return true;
    return levenshteinDistance(word, target) <= maxDistance;
}

// ---- PARSER ----

export function parseQueryRegex(query: string): ParsedQuery {
    const normalized = normalizeText(query);
    const words = normalized.split(' ');

    let category: string | null = null;
    let categoryId: string | null = null;
    let volume: string | null = null;
    let unit: string | null = null;
    let city: string | null = null;
    let delivery: boolean | null = null;
    let grade: string | null = null;
    let confidence = 0;
    const suggestions: Suggestion[] = [];

    // 1. Extract category
    for (const [key, catData] of Object.entries(CATEGORY_SYNONYMS)) {
        for (const keyword of catData.keywords) {
            const keywordWords = keyword.split(' ');
            if (keywordWords.length > 1) {
                // Multi-word keyword
                if (normalized.includes(keyword)) {
                    category = catData.label;
                    categoryId = key;
                    confidence += 0.35;
                    break;
                }
            } else {
                // Single word — exact or fuzzy
                for (const word of words) {
                    if (word === keyword || fuzzyMatch(word, keyword)) {
                        category = catData.label;
                        categoryId = key;
                        confidence += 0.35;
                        break;
                    }
                }
            }
            if (category) break;
        }
        if (category) break;
    }

    // 2. Extract grade
    for (const pattern of GRADE_PATTERNS) {
        const match = query.match(pattern);
        if (match) {
            grade = `М${match[1]}`;
            confidence += 0.15;
            // If grade found but no category => it's probably concrete
            if (!category) {
                category = 'Бетон';
                categoryId = 'concrete';
                confidence += 0.2;
            }
            break;
        }
    }

    // 3. Extract volume + unit
    for (const { regex, unit: defaultUnit } of VOLUME_PATTERNS) {
        const match = normalized.match(regex);
        if (match) {
            volume = match[1].replace(',', '.');
            unit = defaultUnit;
            // Infer unit from category context if not explicit
            if (!unit && categoryId) {
                if (['concrete', 'blocks'].includes(categoryId)) unit = 'м³';
                else if (['aggregates', 'rebar'].includes(categoryId)) unit = 'тонн';
                else if (categoryId === 'machinery') unit = 'час';
            }
            confidence += 0.15;
            break;
        }
    }

    // 4. Extract city
    for (const word of words) {
        const cityMatch = CITY_SYNONYMS[word];
        if (cityMatch) {
            city = cityMatch;
            confidence += 0.15;
            break;
        }
    }
    // Default to Шымкент if not found
    if (!city) {
        city = 'Шымкент';
        confidence += 0.05;
    }

    // 5. Extract delivery
    for (const keyword of DELIVERY_KEYWORDS) {
        if (normalized.includes(keyword)) {
            delivery = true;
            confidence += 0.1;
            break;
        }
    }

    // 6. Generate suggestions if confidence is low
    if (!category) {
        confidence = Math.max(confidence, 0.05);
        suggestions.push(
            { type: 'category', label: 'Бетон?', value: 'concrete' },
            { type: 'category', label: 'Инертные?', value: 'aggregates' },
            { type: 'category', label: 'Кирпич/блоки?', value: 'blocks' },
            { type: 'category', label: 'Арматура?', value: 'rebar' },
            { type: 'category', label: 'Цемент?', value: 'cement' },
            { type: 'category', label: 'Спецтехника?', value: 'machinery' },
            { type: 'category', label: 'ПВХ профили?', value: 'pvc-profiles' },
            { type: 'category', label: 'Общестрой?', value: 'general-materials' },
            { type: 'category', label: 'Малярка?', value: 'painting-tools' },
            { type: 'category', label: 'Ручной инструмент?', value: 'hand-tools' },
            { type: 'category', label: 'Крепеж?', value: 'fasteners' },
        );
    }

    if (delivery === null && category) {
        suggestions.push(
            { type: 'delivery', label: 'Нужна доставка?', value: 'true' },
        );
    }

    if (!volume && category) {
        suggestions.push(
            { type: 'volume', label: 'Укажите объём', value: '' },
        );
    }

    // Cap confidence at 1
    confidence = Math.min(confidence, 1);

    return {
        category,
        categoryId,
        volume,
        unit,
        city,
        delivery,
        grade,
        confidence,
        suggestions,
        originalQuery: query,
    };
}

export const parseQuery = parseQueryLLM;
