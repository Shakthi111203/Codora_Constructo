import dotenv from "dotenv";
dotenv.config();

import express from "express";
import Groq from "groq-sdk";

const router = express.Router();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { url, imageBase64, mimeType } = req.body;

    if (!url && !imageBase64) {
      return res.status(400).json({ error: "Provide a URL or screenshot." });
    }

    let messages;

    const systemPrompt = `You are a UI/UX analyst. Analyze the given app and extract its DNA.
Return ONLY a valid JSON object — no markdown, no backticks, no explanation.
The JSON must have exactly these fields:
{
  "appName": "suggested name for a similar app",
  "domain": one of: "food" | "wellness" | "services" | "education" | "healthcare" | "general",
  "primaryColor": "hex color string e.g. #FC8019",
  "style": "2-3 word description e.g. card-heavy bold modern",
  "pages": ["array", "of", "page", "names", "max 6"],
  "sections": {
    "PageName": ["section1", "section2"]
  },
  "prompt": "one sentence describing this app for a builder prompt"
}`;

    if (imageBase64) {
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType || "image/png"};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Analyze this app screenshot and extract its DNA. Return only JSON.",
            },
          ],
        },
      ];
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this app URL and extract its DNA: ${url}
Based on the URL and your knowledge of this app/website, extract the DNA.
Return only JSON.`,
        },
      ];
    }

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.3,
    });

    const raw   = response.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, "").trim();
    const dna   = JSON.parse(clean);

    res.json({ dna });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;