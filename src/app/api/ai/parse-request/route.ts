import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Инициализация Gemini
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

// Схема ответа для TypeScript
interface AIParseResponse {
  product: string;
  category: "CONCRETE" | "INERT" | "BRICK" | "BLOCKS" | "CEMENT" | "OTHER" | "INVALID";
  volume: number | null;
  volumeUnit: string | null;
  location: string | null;
  deliveryNeeded: boolean;
  urgent: boolean;
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
    
    // Используем быструю модель Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            product: { type: SchemaType.STRING, description: "Название товара (нормализованное)" },
            category: { 
              type: SchemaType.STRING, 
              enum: ["CONCRETE", "INERT", "BRICK", "BLOCKS", "CEMENT", "OTHER", "INVALID"],
              description: "Категория товара"
            },
            volume: { type: SchemaType.NUMBER, description: "Объем (число) или null", nullable: true },
            volumeUnit: { type: SchemaType.STRING, description: "Единица измерения (м3, т, шт) или null", nullable: true },
            location: { type: SchemaType.STRING, description: "Город/Район доставки или null", nullable: true },
            deliveryNeeded: { type: SchemaType.BOOLEAN, description: "Нужна ли доставка (default: true)" },
            urgent: { type: SchemaType.BOOLEAN, description: "Срочность" },
            details: { type: SchemaType.STRING, description: "Детали (марка, фракция)", nullable: true },
            rawContact: { type: SchemaType.STRING, description: "Контактные данные из текста или null", nullable: true },
            userMessage: { type: SchemaType.STRING, description: "Ответ бота пользователю (подтверждение или уточнение)" }
          },
          required: ["product", "category", "deliveryNeeded", "urgent", "userMessage"]
        }
      }
    });

    // 3. Промпт
    const systemInstruction = `
      Ты — AI-менеджер строительной биржи Westroy.
      Твоя задача — извлекать структурированные данные из запросов на закупку стройматериалов.
      
      ПРАВИЛА:
      1. Если запрос не про стройку (спам, продажа гаража), ставь category="INVALID".
      2. Если категория не очевидна, ставь "OTHER".
      3. volume должен быть числом. Если в тексте "5 кубов", volume=5, volumeUnit="м3".
      4. userMessage: Сформируй вежливый ответ на русском языке.
         - Если данных достаточно: "Принято! Бетон М300, 5 кубов в Акжар. Ищу поставщиков..."
         - Если нет объема/марки: "Какой объем бетона вам нужен?"
    `;

    // 4. Запрос к модели
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemInstruction + "\n\nЗАПРОС ПОЛЬЗОВАТЕЛЯ:\n" + text }] }
      ]
    });

    const responseText = result.response.text();
    let parsedData: AIParseResponse;

    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", responseText);
      return NextResponse.json(
        { success: false, error: "AI returned invalid JSON" },
        { status: 502 }
      );
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
