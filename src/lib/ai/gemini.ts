import { GoogleGenerativeAI } from "@google/generative-ai";

// Инициализация. API KEY должен быть в .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseConstructionRequest(userText: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Используй Flash для скорости

    const prompt = `
    Ты — умный парсер строительного маркетплейса Westroy.kz.
    Твоя задача: извлечь структурированные данные из запроса клиента.
    
    Запрос клиента: "${userText}"
    
    Верни ТОЛЬКО JSON объект (без markdown, без пояснений), строго по этой схеме:
    {
      "category": string | null,    // Например: "Бетон", "Кирпич"
      "productType": string | null, // Например: "М300", "Красный жженый"
      "volume": number | null,      // Число
      "unit": string | null,        // Единица: "m3", "tons", "pcs"
      "delivery": boolean,          // Нужна ли доставка
      "location": string | null,    // Город или район (если указан)
      "urgency": "low" | "medium" | "high" // Срочность
    }
    
    Если данных нет — ставь null.
    Если число написано текстом ("десять кубов") — преврати в число (10).
    Если упомянуты "Камаз" или "ЗИЛ" — конвертируй в примерный объем (Камаз ≈ 10-15т, ЗИЛ ≈ 5т).
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Очистка от возможных markdown-оберток \`\`\`json ... \`\`\`
        const cleanJson = text.replace(/\`\`\`json|\`\`\`/g, "").trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Gemini Parse Error:", error);
        return null; // Или верни дефолтный пустой объект
    }
}
