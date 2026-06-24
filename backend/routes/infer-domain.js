import express from "express";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/", async (req, res) => {
  const { appName, userPrompt } = req.body;

  try {
    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are a UI/UX analyst. Given an app name and description, return ONLY valid JSON with these exact keys. No markdown, no explanation, pure JSON only:
{
  "domain": "one word category (e.g. food, healthcare, portfolio, dating, fitness)",
  "intent": "short phrase describing app purpose",
  "primaryColor": "#hexcode that fits the domain",
  "styleHints": [
    "specific UI hint 1",
    "specific UI hint 2", 
    "specific UI hint 3",
    "specific UI hint 4"
  ],
  "pages": ["Home", "PageName2", "PageName3", "PageName4"],
  "sections": {
    "Home": ["Hero", "Section1", "Section2"],
    "PageName2": ["Content", "List"],
    "PageName3": ["Detail", "Form"]
  }
}

Rules for pages and sections:
- Generate 3-6 pages that make sense for the described app
- Each page must have 2-4 relevant sections
- Page names must be Title Case single words or short phrases
- Sections must describe actual UI content (not generic names like "Content")
- styleHints must be specific design instructions (colors, layout, animations, components)`
        },
        {
          role: "user",
          content: `App name: "${appName}"\nDescription: "${userPrompt}"`
        }
      ]
    });

    const raw = response.choices[0].message.content.trim();

    // Strip markdown fences if model wraps in ```json
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const json = JSON.parse(cleaned);

    // Validate required fields exist
    if (!json.domain || !json.pages || !json.sections) {
      throw new Error("Missing required fields in AI response");
    }

    res.json(json);

  } catch (err) {
    console.error("infer-domain error:", err.message);
    // Safe fallback
    res.json({
      domain: "general",
      intent: "app",
      primaryColor: "#4f46e5",
      styleHints: [
        "Clean modern layout with card-based design",
        "Rounded corners and soft shadows on all cards",
        "Primary color used for buttons and highlights",
        "Responsive grid layout for content sections"
      ],
      pages: ["Home", "Explore", "Profile"],
      sections: {
        Home:    ["Hero Banner", "Featured Items", "Quick Actions"],
        Explore: ["Search Bar", "Filter Chips", "Results Grid"],
        Profile: ["User Info", "Settings", "Activity History"],
      }
    });
  }
});

export default router;