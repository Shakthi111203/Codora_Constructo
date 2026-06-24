import dotenv from "dotenv";
dotenv.config();

import express from "express";

const router = express.Router();

/* ─────────────────────────────────────────────────────
   Domain + page → Unsplash search keywords
───────────────────────────────────────────────────── */
const KEYWORD_MAP = {
  food: {
    default:      ["food","burger","pizza","sushi","restaurant"],
    Home:         ["restaurant","food-delivery","cuisine","dining"],
    Menu:         ["burger","pizza","sushi","pasta","tacos"],
    Cart:         ["food","takeout","meal"],
    Orders:       ["food-delivery","takeout","meal-box"],
    Profile:      ["portrait","person","avatar"],
  },
  wellness: {
    default:      ["fitness","yoga","workout","gym","wellness"],
    Home:         ["wellness","health","fitness"],
    Workouts:     ["gym","exercise","workout","training"],
    Progress:     ["running","fitness","achievement"],
    Plans:        ["yoga","meditation","stretching"],
    Profile:      ["portrait","athlete","person"],
  },
  healthcare: {
    default:      ["doctor","medical","hospital","clinic"],
    Home:         ["hospital","healthcare","medical"],
    Doctors:      ["doctor","physician","medical"],
    Appointments: ["clinic","consultation","medical"],
    Profile:      ["portrait","doctor","person"],
  },
  education: {
    default:      ["education","studying","books","classroom"],
    Home:         ["education","university","campus"],
    Courses:      ["studying","books","classroom","lecture"],
    Lessons:      ["learning","student","study"],
    Progress:     ["graduation","achievement","student"],
    Profile:      ["student","portrait","person"],
  },
  services: {
    default:      ["service","professional","business"],
    Home:         ["business","service","professional"],
    Services:     ["tools","repair","salon","service"],
    Booking:      ["calendar","appointment","office"],
    Profile:      ["portrait","professional","person"],
  },
  general: {
    default:      ["technology","business","modern","digital"],
  },
};

function getKeywords(domain, page) {
  const domainMap = KEYWORD_MAP[domain] || KEYWORD_MAP.general;
  return domainMap[page] || domainMap.default;
}

/* ─────────────────────────────────────────────────────
   Resolve Unsplash redirect → real CDN URL
   Unsplash Source redirects to images.unsplash.com CDN
   which DOES load in iframes — we just need the final URL
───────────────────────────────────────────────────── */
async function resolveUnsplashUrl(keyword, width, height, index) {
  const url = `https://source.unsplash.com/featured/${width}x${height}?${keyword}&sig=${index}`;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    // After redirect, res.url is the actual CDN URL like:
    // https://images.unsplash.com/photo-xxx?...
    if (res.url && res.url.includes("unsplash.com")) {
      return res.url;
    }
  } catch {
    // fall through to fallback
  }
  return null;
}

/* ─────────────────────────────────────────────────────
   GET /api/images?domain=food&page=Menu&count=6
───────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  const { domain = "general", page = "Home", count = 6 } = req.query;
  const n        = Math.min(parseInt(count) || 6, 10);
  const keywords = getKeywords(domain, page);

  try {
    const results = await Promise.all(
      Array.from({ length: n }, async (_, i) => {
        const keyword = keywords[i % keywords.length];
        const w = 400, h = 300;

        const resolved = await resolveUnsplashUrl(keyword, w, h, i + 1);
        if (resolved) return resolved;

        // Fallback to picsum if unsplash fails
        const FALLBACK_IDS = {
          food:       [292, 312, 326, 431, 488, 493, 674, 677],
          wellness:   [416, 703, 724, 826, 863, 884, 1040, 1041],
          healthcare: [40, 91, 177, 213, 338, 395, 461, 582],
          education:  [159, 212, 256, 267, 380, 461, 542, 560],
          services:   [48, 96, 119, 160, 180, 248, 274, 365],
          general:    [10, 20, 30, 40, 50, 60, 70, 80],
        };
        const ids = FALLBACK_IDS[domain] || FALLBACK_IDS.general;
        return `https://picsum.photos/id/${ids[i % ids.length]}/${w}/${h}`;
      })
    );

    res.json({ images: results, domain, page });
  } catch (err) {
    console.error("Images error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;