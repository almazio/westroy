import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Инициализация OpenAI. Ключ берется автоматически из process.env.OPENAI_API_KEY
// Если ключа нет — будет ошибка, поэтому делаем проверку внутри хендлера.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key", // Fallback чтобы не падал билд, но в рантайме нужна проверка
});

// Схема ответа (для документации и фронтенда)
interface AIParseResponse {
  product: string;
  category: "CONCRETE" | "INERT" | "BRICK" | "BLOCKS" | "CEMENT" | "OTHER" | "INVALID";
  volume: number | null;
  volumeUnit: string | null;
  location: string | null;
  deliveryNeeded: boolean;
  urgent: boolean;
  rawContact: string | null;
  userMessage: string; // Ответ бота пользователю
}

export async function POST(req: NextRequest) {
  try {
    // 1. Проверка API ключа
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key is missing on server" },
        { status: 500 }
      );
    }

    // 2. Получение текста из тела запроса
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'text' is required and must be a string" },
        { status: 400 }
      );
    }

    // 3. Формирование промпта для AI
    const systemPrompt = `
      Ты — AI-менеджер строительной биржи Westroy. Твоя задача — извлекать структурированные данные из сырых запросов клиентов на закупку стройматериалов.

      ТВОЯ ЦЕЛЬ:
      Преобразовать текст пользователя в JSON-объект строго по схеме ниже.

      ФОРМАТ ВЫВОДА (JSON ONLY):
      {
        "product": "Название товара (нормализованное, например: Бетон М300)",
        "category": "Категория товара (строго одно из: CONCRETE, INERT, BRICK, BLOCKS, CEMENT, OTHER, INVALID)",
        "volume": число или null (только цифра),
        "volumeUnit": "ед. изм. (м3, т, шт, кг) или null",
        "location": "Город или район доставки (если указан, иначе null)",
        "deliveryNeeded": true/false (по умолчанию true, если не указан самовывоз),
        "urgent": true/false (если есть слова 'срочно', 'сегодня', 'сейчас'),
        "details": "Любые важные детали (марка, фракция, особенности заезда, и т.д.)",
        "rawContact": "Контактные данные, если есть в тексте (телефон, имя), иначе null",
        "userMessage": "Текст твоего ответа пользователю. Если данных хватает — подтверди заказ и скажи что ищешь поставщиков. Если данных мало (нет объема или марки) — задай уточняющий вопрос."
      }

      ПРАВИЛА:
      1. Если запрос не относится к стройматериалам (например "продам гараж" или спам), ставь category: "INVALID" и userMessage: "Я занимаюсь только поиском стройматериалов."
      2. Если категория не очевидна, ставь "OTHER".
      3. В поле volume пиши только число. Единицу измерения в volumeUnit.
      4. ОТВЕЧАЙ ТОЛЬКО ЧИСТЫМ JSON. Без markdown блоков \`\`\`.
    `;

    // 4. Запрос к OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Используем быструю и дешевую модель
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3, // Низкая температура для предсказуемости
      max_tokens: 500,
    });

    const rawContent = completion.choices[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error("Empty response from OpenAI");
    }

    // 5. Парсинг ответа (убираем возможные markdown-обертки)
    const jsonStr = rawContent.replace(/^```json/, "").replace(/```$/, "").trim();
    let parsedData: AIParseResponse;

    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent);
      return NextResponse.json(
        { success: false, error: "AI returned invalid JSON" },
        { status: 502 }
      );
    }

    // 6. Успешный ответ
    return NextResponse.json({
      success: true,
      data: parsedData,
    });

  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
