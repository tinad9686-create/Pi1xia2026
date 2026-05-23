import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import path from "path";
// Vite middleware setup will be dynamically loaded in development
import { GoogleGenAI } from "@google/genai";

const app = express();
const isDev = process.env.NODE_ENV !== "production";
const PORT = isDev ? 3000 : parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

async function startServer() {
  // Gemini AI Route
  app.post("/api/generateContent", async (req, res) => {
    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(500).json({ error: "API key not configured on server" });
      }

      const genAI = new GoogleGenAI({ apiKey: key });
      const { model, contents, config } = req.body;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      try {
        const responseStream = await genAI.models.generateContentStream({
          model: model || "gemini-2.5-flash",
          contents: contents,
          config: config
        });

        for await (const chunk of responseStream) {
          if (chunk.text) res.write(chunk.text);
        }
        res.end();
      } catch (err: any) {
        console.error("Gemini Generation Error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message || "Failed to generate content" });
        } else {
          res.end("\n\n[ERROR: Generation Failed]");
        }
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal Server Error" });
      } else {
        res.end();
      }
    }
  });

  // Vite middleware for development / Static files for production
  if (isDev) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, serving static files");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*all", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Bypass 30-second internal limit for long-running AI requests
  server.setTimeout(3600000); // 60 minutes
  server.keepAliveTimeout = 3600000;
  server.headersTimeout = 3600000;
}

startServer();

