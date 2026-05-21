import express from "express";
import serverless from "serverless-http";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

app.post("/api/generateContent", async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "API key not configured on server" });
    }

    const genAI = new GoogleGenAI({ apiKey: key });
    const { model, contents, config } = req.body;

    const response = await genAI.models.generateContent({
      model: model || "gemini-2.5-flash",
      contents: contents,
      config: config
    });

    res.json({
      candidates: response.candidates
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export const handler = serverless(app);
