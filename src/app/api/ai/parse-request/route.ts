import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Инициализация Gemini
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

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

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Используем gemini-pro (она точно доступна в v1beta/public API)
    // Flash может требовать другой endpoint или версию SDK.
    // Если gemini-pro будет медленной, попробуем gemini-1.5-flash-latest
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Промпт
    // Мы просим JSON текстом, т.к. режим responseMimeType="application/json" иногда
    // капризничает с моделями в v1beta. Надежнее пропарсить руками.
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

    // 4. Запрос к модели
    const result = await model.generateContent(systemInstruction);
    const responseText = result.response.text();

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
    console.error("Gemini Parse Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
