import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any, context: any) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "OPTIONS") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    };
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return { 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "API key not configured on server" }) 
      };
    }

    const genAI = new GoogleGenAI({ apiKey: key });
    const body = event.body ? JSON.parse(event.body) : {};
    const { model, contents, config } = body;

    const response = await genAI.models.generateContent({
      model: model || "gemini-2.5-flash",
      contents: contents,
      config: config
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        candidates: response.candidates
      })
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: error.message || "Internal Server Error" })
    };
  }
};
