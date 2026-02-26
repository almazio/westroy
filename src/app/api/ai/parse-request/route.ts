import { NextRequest, NextResponse } from "next/server";

// Инициализация
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
// Берем модель из env или дефолт (gemini-pro - самая надежная)
// Можно попробовать gemini-1.5-flash, если нужна скорость.
const modelName = process.env.GEMINI_MODEL || "gemini-pro";

// Устанавливаем максимальное время выполнения функции (Vercel)
export const maxDuration = 30; // seconds

// Схема ответа для TypeScript
interface AIParseResponse {
  product: string;
  category: "CONCRETE" | "INERT" | "BRICK" | "BLOCKS" | "CEMENT" | "OTHER" | "INVALID";
  volume: number | null;
  volumeUnit: string | null;
  location: string | null;
  deliveryNeeded: boolean;
  urgent: boolean;
  details: string | null;
  rawContact: string | null;
  userMessage: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Проверка API ключа
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GOOGLE_API_KEY is missing on server" },
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

    // 3. Промпт
    const systemInstruction = `
      Ты — AI-менеджер строительной биржи Westroy.
      Твоя задача — извлекать структурированные данные из запросов на закупку стройматериалов.
      
      ВХОДНОЙ ЗАПРОС: "${text}"

      ТВОЯ ЦЕЛЬ:
      Вернуть ТОЛЬКО JSON объект (без markdown, без \`\`\`) следующей структуры:
      {
        "product": "Название товара (нормализованное, например: Бетон М300)",
        "category": "Категория (одна из: CONCRETE, INERT, BRICK, BLOCKS, CEMENT, OTHER, INVALID)",
        "volume": число или null,
        "volumeUnit": "ед. изм. (м3, т, шт) или null",
        "location": "Город/Район доставки или null",
        "deliveryNeeded": true/false (default true),
        "urgent": true/false,
        "details": "Детали (марка, фракция) или null",
        "rawContact": "Контакты из текста или null",
        "userMessage": "Твой вежливый ответ клиенту на русском. Подтверди детали заказа."
      }

      ПРАВИЛА:
      1. Если запрос спам/не стройка -> category="INVALID", userMessage="Я ищу только стройматериалы.".
      2. volume только число.
      3. userMessage должен быть кратким и полезным.
    `;

    // 4. Прямой запрос к REST API (без SDK)
    // Используем v1beta, так как это основной эндпоинт для Gemini API (через API Key)
    // Если gemini-pro в v1beta недоступна (странно, но бывает), можно попробовать v1.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log(`Calling Gemini API directly: ${modelName}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemInstruction }]
        }]
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", response.status, errorText);
        throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
        throw new Error("Empty response from Gemini API");
    }

    // Очистка от markdown (```json ... ```)
    const jsonStr = responseText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();

    let parsedData: AIParseResponse;

    try {
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse Gemini response:", responseText);
      // Fallback если AI вернул мусор
      return NextResponse.json({
        success: true,
        data: {
          product: text.substring(0, 50),
          category: "OTHER",
          userMessage: "Принято! Ищу предложения по вашему запросу...",
          details: null
        }
      });
    }

    // 5. Успешный ответ
    return NextResponse.json({
      success: true,
      data: parsedData,
    });

  } catch (error: any) {
    console.error(`Gemini Parse Error (Model: ${modelName}):`, error);
    
    // Подсказка про 404
    if (error.message?.includes("404") || error.message?.includes("not found")) {
        return NextResponse.json(
            { success: false, error: `Model '${modelName}' not found via REST API. Check GEMINI_MODEL env var or try 'gemini-1.5-flash'.` },
            { status: 500 }
        );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
