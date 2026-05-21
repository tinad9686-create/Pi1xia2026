import { GoogleGenAI } from "@google/genai";
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function testModel(name: string) {
  try {
    const response = await genAI.models.generateContent({
      model: name,
      contents: 'hello'
    });
    console.log(name, 'OK:', response.text.substring(0, 10));
  } catch (e: any) { console.error(name, 'error:', e.message); }
}

async function run() {
  await testModel('gemini-2.5-pro');
  await testModel('gemini-2.0-flash');
  await testModel('gemini-2.5-flash');
  await testModel('gemini-1.5-pro');
}
run();

