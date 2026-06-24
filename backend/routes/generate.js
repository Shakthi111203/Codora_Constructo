import dotenv from "dotenv";
dotenv.config();

import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Strips markdown fences and extracts clean code
function extractCode(raw) {
  const match = raw.match(/```(?:jsx?|tsx?)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

// Ensures the export default matches the component name
function fixExportDefault(code, componentName) {
  // Remove any existing export default
  let fixed = code.replace(/export\s+default\s+\w+;?/g, "").trim();

  // Find the actual function/class name defined in the code
  const funcMatch = fixed.match(
    /(?:function|class)\s+([A-Z][a-zA-Z0-9]*)\s*[\({]/
  );
  const arrowMatch = fixed.match(
    /(?:const|let)\s+([A-Z][a-zA-Z0-9]*)\s*=/
  );

  const actualName = funcMatch?.[1] || arrowMatch?.[1] || componentName;

  // Rename to expected componentName if different
  if (actualName !== componentName) {
    fixed = fixed.replaceAll(actualName, componentName);
  }

  // Append correct export
  fixed += `\n\nexport default ${componentName};`;
  return fixed;
}

router.post("/", async (req, res) => {
  try {
    const { prompt, page, app, componentName } = req.body;

    if (!prompt) return res.status(400).json({ error: "Prompt missing" });

    console.log("⚡ Generating page:", page, "| Component:", componentName);

    const systemPrompt = `You are an expert React developer. Follow these rules strictly:
1. Return ONLY the React component code — no explanations, no markdown text outside the code block.
2. Wrap the code in a single \`\`\`jsx code block.
3. The component function MUST be named exactly: ${componentName || page || "Page"}
4. End the file with: export default ${componentName || page || "Page"};
5. Use only inline styles or Tailwind classes (no CSS imports).
6. Do NOT import from local files — only from 'react' or 'react-router-dom'.
7. Make the UI beautiful, modern, and fully functional with realistic placeholder data.`;

    let raw = "";
    let attempts = 0;

    while (attempts < 3) {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.5 // lower = more consistent output
      });

      raw = response.choices[0].message.content;
      const code = extractCode(raw);

      // Verify the export exists correctly
      const expectedExport = componentName || page || "Page";
      if (
        code.includes(`export default ${expectedExport}`) ||
        code.includes(`export default function ${expectedExport}`)
      ) {
        return res.json({ code });
      }

      // Auto-fix the export and return
      const fixed = fixExportDefault(code, expectedExport);
      return res.json({ code: fixed });
    }

    res.status(500).json({ error: "Failed to generate valid component after retries" });

  } catch (err) {
    console.error("Groq Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;