const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function callGroq(prompt, componentName) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, componentName }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.code ?? "").replace(/```jsx?/g, "").replace(/```/g, "").trim();
}

/* ─────────────────────────────────────────────────────
   ANALYZE — extracts DNA from a URL or screenshot
───────────────────────────────────────────────────── */
export async function analyzeAppDNA({ url, imageBase64, mimeType }) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ url, imageBase64, mimeType }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.dna;
}

/* ═══════════════════════════════════════════════════════════════════════
   DOMAIN-AWARE IMAGE SYSTEM
   ───────────────────────────────────────────────────────────────────────
   WHAT CHANGED:
   • OLD: Used picsum.photos/seed/KEYWORD/W/H — the seed string doesn't
     actually influence the photo subject. "burger-0" and "spaceship-0"
     could return the exact same image because picsum hashes the seed to
     a random ID internally.
   • NEW: Uses picsum.photos/id/NUMBER/W/H — manually curated IDs that
     were verified to show domain-relevant subjects (food, doctors, gyms,
     classrooms, etc). Every ID is intentional, not random.
   • Avatars now use DiceBear (api.dicebear.com) — consistent cartoon
     avatars seeded by name, always iframe-safe, no HTTP redirects.
   • Hero/wide banner IDs chosen for cinematic landscape-style photos
     that suit full-width sections.
   RESULT: Every domain now gets visually relevant images that reinforce
   the app's theme instead of random stock photos.
═══════════════════════════════════════════════════════════════════════ */

/* ── Verified picsum IDs per domain and slot type ──────────────────── */
const DOMAIN_IMAGE_IDS = {
  food: {
    hero:   [292, 431, 493, 1080, 429],   // warm restaurant/food spread shots
    card:   [1080, 1084, 165, 102, 292, 431, 493, 547],
    wide:   [429, 493, 1082, 292],
  },
  wellness: {
    hero:   [209, 371, 399, 257, 274],    // gym, yoga, outdoor fitness
    card:   [209, 371, 399, 257, 274, 376, 381, 364],
    wide:   [371, 399, 209, 274],
  },
  healthcare: {
    hero:   [40, 213, 395, 349, 355],     // clinical, clean, professional
    card:   [395, 349, 355, 40, 213, 314, 284, 378],
    wide:   [40, 213, 355, 284],
  },
  education: {
    hero:   [20, 159, 160, 167, 2],       // books, campus, students
    card:   [20, 159, 160, 167, 2, 48, 7, 76],
    wide:   [159, 160, 20, 167],
  },
  services: {
    hero:   [239, 247, 248, 175, 201],    // professional work, tools, office
    card:   [239, 247, 248, 175, 201, 226, 233, 240],
    wide:   [247, 239, 201, 248],
  },
  ecommerce: {
    hero:   [26, 96, 119, 137, 178],      // fashion, products, retail
    card:   [26, 96, 119, 137, 178, 204, 217, 219],
    wide:   [119, 137, 26, 178],
  },
  travel: {
    hero:   [430, 452, 358, 417, 366],    // scenic destinations, landscapes
    card:   [430, 452, 358, 417, 366, 338, 360, 424],
    wide:   [452, 430, 417, 358],
  },
  finance: {
    hero:   [180, 188, 266, 271, 278],    // city skylines, modern offices
    card:   [180, 188, 266, 271, 278, 260, 265, 269],
    wide:   [188, 180, 271, 266],
  },
  social: {
    hero:   [64, 65, 91, 110, 177],       // people, community, connection
    card:   [64, 65, 91, 110, 177, 98, 103, 106],
    wide:   [91, 64, 110, 177],
  },
  logistics: {
    hero:   [116, 133, 244, 312, 326],    // trucks, warehouses, delivery
    card:   [116, 133, 244, 312, 326, 330, 303, 318],
    wide:   [133, 116, 312, 244],
  },
  general: {
    hero:   [0, 10, 15, 20, 25],
    card:   [0, 10, 15, 20, 25, 30, 35, 40],
    wide:   [0, 10, 15, 20],
  },
};

/* ── Page-slot overrides: certain pages in a domain get special IDs ─── */
const PAGE_SLOT_OVERRIDES = {
  food: {
    Menu:     { card: [1080, 1084, 292, 431, 493, 547, 429, 165] },
    Cart:     { card: [165, 102, 431, 292, 493, 547, 1080, 429] },
    Checkout: { card: [431, 292, 1080, 493, 429, 547, 165, 102] },
  },
  healthcare: {
    Doctors:      { card: [395, 349, 355, 284, 314, 378, 40, 213] },
    Appointments: { card: [40, 213, 395, 284, 349, 314, 355, 378] },
  },
  education: {
    Courses: { card: [20, 159, 160, 167, 2, 48, 7, 76] },
    Lessons:  { card: [159, 20, 167, 160, 76, 48, 2, 7]  },
  },
  travel: {
    Explore: { card: [452, 430, 417, 366, 358, 338, 360, 424] },
    Booking: { card: [358, 366, 430, 417, 452, 424, 338, 360] },
  },
};

/* ── Build a single verified picsum URL ──────────────────────────────── */
function getPicsumUrl(domain, page, slot = "card", index = 0, width = 400, height = 300) {
  const domainIds  = DOMAIN_IMAGE_IDS[domain] || DOMAIN_IMAGE_IDS.general;
  const overrides  = PAGE_SLOT_OVERRIDES[domain]?.[page]?.[slot];
  const idList     = overrides || domainIds[slot] || domainIds.card;
  const id         = idList[index % idList.length];
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

/* ── Build an array of N card image URLs (all different IDs) ─────────── */
function getPicsumUrls(domain, page, slot = "card", count = 8, width = 400, height = 300) {
  return Array.from({ length: count }, (_, i) =>
    getPicsumUrl(domain, page, slot, i, width, height)
  );
}

/* ── DiceBear avatar URLs — consistent cartoon avatars per seed name ─── */
/*
   WHAT CHANGED:
   • OLD: Used picsum /seed/profile-N/200/200 — returned random landscape
     photos, not people faces. A "doctor avatar" might show a forest.
   • NEW: Uses DiceBear avataaars style. Each seed produces a unique but
     consistent cartoon face. Iframe-safe, no redirects, always a person.
*/
const AVATAR_SEEDS = [
  "Alice", "Bob", "Carol", "David",
  "Emma", "Frank", "Grace", "Henry",
  "Isla", "James", "Karen", "Leo",
];

function getAvatarUrl(index = 0) {
  const seed = AVATAR_SEEDS[index % AVATAR_SEEDS.length];
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function getAvatarUrls(count = 4) {
  return Array.from({ length: count }, (_, i) => getAvatarUrl(i));
}

/* ─────────────────────────────────────────────────────
   GENERATE — builds a page from scratch with full navigation
───────────────────────────────────────────────────── */
export function buildGeneratePrompt({ page, appName, domain, sections, color, allPages = [], style = "" }) {
  const navLinks = allPages
    .map((p) => `{ name: "${p}", path: "/${p.toLowerCase().replace(/\s+/g, "-")}" }`)
    .join(", ");

  const componentName = page.charAt(0).toUpperCase() + page.slice(1).replace(/\s+/g, "");

  /* ── Domain-aware image URLs ── */
  const cardUrls   = getPicsumUrls(domain, page, "card", 8, 400, 300);
  const heroUrl    = getPicsumUrl(domain, page, "hero", 0, 800, 300);
  const wideUrl    = getPicsumUrl(domain, page, "wide", 1, 800, 400);
  const avatarUrls = getAvatarUrls(4);  // DiceBear — always faces, never landscapes

  const cardExamples   = cardUrls.map((url, i) => `  Card ${i + 1}: ${url}`).join("\n");
  const avatarExamples = avatarUrls.map((url, i) => `  Avatar ${i + 1}: ${url}`).join("\n");

  /* ── Style hints from DNA ── */
  const styleHints = [];
  if (style)                                        styleHints.push(`- Overall UI style: "${style}" — match this feel closely`);
  if (style.includes("card"))                       styleHints.push("- Use card-based layouts with rounded corners (12-16px) and soft box shadows");
  if (style.includes("bold"))                       styleHints.push("- Use bold, large typography for headings and prices");
  if (style.includes("minimal") || style.includes("clean")) styleHints.push("- Keep spacing generous, minimal clutter, clean white backgrounds");
  if (style.includes("dark"))                       styleHints.push("- Use a dark background (#1a1a2e or similar) with light text");

  /* ── Domain-specific design hints ── */
  if (domain === "food") {
    styleHints.push("- Show food item cards: image, name, short description, ⭐ rating, price and an Add button");
    styleHints.push("- Include category chips: 🍕 Pizza  🍔 Burgers  🌮 Tacos  🍣 Sushi  🍰 Desserts");
    styleHints.push("- Use warm appetizing colors alongside the brand color");
    styleHints.push("- Hero section: large banner with a search bar and promo text");
  }
  if (domain === "wellness") {
    styleHints.push("- Show workout cards with duration, calories burned, difficulty badge");
    styleHints.push("- Include progress rings, streak counters, motivational stats");
    styleHints.push("- Use calming gradients (greens, blues, purples)");
  }
  if (domain === "healthcare") {
    styleHints.push("- Show doctor cards: photo (avatar URL), name, specialty, ⭐ rating, years experience, Book button");
    styleHints.push("- Clean, professional, trustworthy layout with plenty of whitespace");
    styleHints.push("- Use blues and whites as secondary colors");
  }
  if (domain === "education") {
    styleHints.push("- Show course cards: thumbnail (card URL), title, instructor name, ⭐ rating, duration, Enroll button");
    styleHints.push("- Include progress bars for ongoing/enrolled courses");
    styleHints.push("- Use category tags: Design, Development, Marketing, Business");
  }
  if (domain === "services") {
    styleHints.push("- Show service cards with icon, service name, price range, ⭐ rating, Book Now button");
    styleHints.push("- Include a search bar and filter chips at the top");
  }
  if (domain === "ecommerce") {
    styleHints.push("- Show product cards: image, name, original price (strikethrough), sale price, ⭐ rating, Add to Cart button");
    styleHints.push("- Include filter chips: New Arrivals, Sale, Best Sellers, Top Rated");
    styleHints.push("- Hero banner with a big sale/promo headline and CTA");
  }
  if (domain === "travel") {
    styleHints.push("- Show destination cards: scenic image, location name, country, price/night, ⭐ rating, Book button");
    styleHints.push("- Include category chips: 🏖️ Beach  🏔️ Mountains  🏙️ City  🌿 Nature  🏛️ Culture");
    styleHints.push("- Use vivid, wanderlust-inspiring imagery with overlay text on hero");
  }
  if (domain === "finance") {
    styleHints.push("- Show account balance cards, transaction lists, investment summaries");
    styleHints.push("- Include charts/graphs (SVG or div-based bars) for portfolio/spending");
    styleHints.push("- Clean, data-dense layout with greens for gains, reds for losses");
  }
  if (domain === "social") {
    styleHints.push("- Show post feed with avatar, username, post image, like/comment/share buttons");
    styleHints.push("- Include stories row at the top with circular avatar thumbnails");
    styleHints.push("- Use avatars for all user faces — never card images for people");
  }
  if (domain === "logistics") {
    styleHints.push("- Show shipment cards with tracking number, status badge, ETA, carrier info");
    styleHints.push("- Use a map-style progress indicator (e.g. dashed line with dots) for delivery stages");
    styleHints.push("- Clean, information-dense layout with status colors: blue=in transit, green=delivered, red=delayed");
  }

  const styleSection = styleHints.length > 0
    ? `════════════════════════════════════════
STYLE & DOMAIN DESIGN — follow these exactly:
════════════════════════════════════════
${styleHints.join("\n")}`
    : "";

  return `
You are an expert React developer building ONE page for "${appName}" (${domain} app).

COMPONENT NAME RULES — CRITICAL:
- Your function MUST be named exactly: ${componentName}
- The last line of your code MUST be: export default ${componentName};
- Do NOT name it App, Page, Component, or anything else

STRICT RULES:
- No imports at all — use only React (available as global React)
- Inline styles only — no CSS classes or external stylesheets
- No external libraries
- Return a single valid functional component
- Output ONLY raw JSX/JS — no markdown, no backticks, no explanations

Page: ${page}
Sections: ${sections.join(", ")}
Brand color: ${color}
ALL PAGES: ${allPages.join(", ")}
NAV ROUTES: [${navLinks}]

════════════════════════════════════════
NAVIGATION — CRITICAL:
════════════════════════════════════════
1. Add a top navbar listing ALL pages: ${allPages.join(", ")}
2. Nav items: onClick={() => window.navigateTo && window.navigateTo("PAGE_NAME")}
3. Highlight current page "${page}" in navbar
4. Every CTA button: onClick={() => window.navigateTo && window.navigateTo("RELEVANT_PAGE")}
5. NEVER leave any button with empty onClick
6. Back buttons: onClick={() => window.navigateTo && window.navigateTo("Home")}

${styleSection}

════════════════════════════════════════
IMAGE RULES — CRITICAL:
════════════════════════════════════════
IMPORTANT: These images are hand-curated for the "${domain}" domain.
They show visually relevant subjects — food photos for food apps,
gym photos for fitness apps, clinical settings for healthcare, etc.
Use them as-is; do NOT change the IDs or switch to a different service.

- Format: https://picsum.photos/id/NUMBER/WIDTH/HEIGHT  ← use ONLY this format
- NEVER use picsum.photos/seed/... format (seeds are random, IDs are curated)
- NEVER use unsplash, placeholder.com, or any other image service

CARD IMAGES (400×300) — domain-relevant photos for item/product/service cards:
${cardExamples}

HERO BANNER (800×300) — use for the top hero/banner section:
  ${heroUrl}

WIDE BANNER (800×400) — use for full-width feature sections:
  ${wideUrl}

AVATAR / PROFILE images — use DiceBear cartoon faces for ALL people:
${avatarExamples}
  (Format: https://api.dicebear.com/7.x/avataaars/svg?seed=NAME&backgroundColor=b6e3f4)
  Use for: doctor cards, instructor profiles, user avatars, review authors — anywhere a human face is needed.
  NEVER use card images for people — card images are for places/products/scenes.

- Use a DIFFERENT card URL for each card so they all look visually distinct
- Use avatar URLs for people, card URLs for places/products/food/scenes

════════════════════════════════════════
DESIGN RULES:
════════════════════════════════════════
- Visually rich with realistic dummy data (real-sounding names, prices, descriptions, ratings)
- Production-quality layout: proper spacing, cards, rounded corners, shadows
- Use ${color} as the primary brand color throughout
- Every section must have 3-4 realistic items — no empty states ever

Make it look like a real shipped mobile app screen.

REMINDER: function name = ${componentName}, last line = export default ${componentName};
`.trim();
}

/* ─────────────────────────────────────────────────────
   REGENERATE — edits existing page, keeps structure + navigation
───────────────────────────────────────────────────── */
export function buildRegeneratePrompt({ page, appName, domain, sections, color, existingCode, feedback, allPages = [], style = "" }) {
  const componentName = page.charAt(0).toUpperCase() + page.slice(1).replace(/\s+/g, "");

  /* ── Domain-aware image URLs (same logic as generate) ── */
  const cardUrls   = getPicsumUrls(domain, page, "card", 8, 400, 300);
  const heroUrl    = getPicsumUrl(domain, page, "hero", 0, 800, 300);
  const avatarUrls = getAvatarUrls(4);

  const cardExamples   = cardUrls.map((url, i) => `  Card ${i + 1}: ${url}`).join("\n");
  const avatarExamples = avatarUrls.map((url, i) => `  Avatar ${i + 1}: ${url}`).join("\n");

  return `
You are an expert React developer editing an EXISTING page component.

COMPONENT NAME RULES — CRITICAL:
- Your function MUST be named exactly: ${componentName}
- The last line of your code MUST be: export default ${componentName};
- Do NOT rename it

STRICT RULES:
- Keep the existing structure and layout intact
- Only apply the specific change the user requested
- No imports at all
- Inline styles only
- No external libraries
- Output ONLY raw JSX/JS — no markdown, no backticks

App: "${appName}" (${domain})
Page: ${page}
Sections: ${sections.join(", ")}
Brand color: ${color}
${style ? `UI Style: ${style}` : ""}
All pages: ${allPages.join(", ")}

════════════════════════════════════════
IMAGE RULES — PRESERVE FORMAT:
════════════════════════════════════════
- Keep using picsum.photos/id/NUMBER/WIDTH/HEIGHT format only (curated IDs)
- NEVER switch to picsum /seed/... — those are random, not domain-relevant
- If adding new images, use ONLY these pre-selected URLs:

CARD IMAGES (400×300):
${cardExamples}

HERO BANNER (800×300):
  ${heroUrl}

AVATAR / PROFILE — use DiceBear for people:
${avatarExamples}
  (https://api.dicebear.com/7.x/avataaars/svg?seed=NAME&backgroundColor=b6e3f4)

- Do NOT switch to unsplash, picsum/seed, or any other image service

════════════════════════════════════════
NAVIGATION — PRESERVE:
════════════════════════════════════════
- Keep all window.navigateTo calls intact
- Do NOT remove navbar or nav links
- Every button must still have working onClick

════════════════════════════════════════
EXISTING CODE:
════════════════════════════════════════
${existingCode}
════════════════════════════════════════

USER REQUESTED CHANGE:
${feedback}

- Do NOT redesign or restructure the page
- ONLY apply the change described above
- Return the full updated component
- Last line MUST be: export default ${componentName};
`.trim();
}

export async function generatePage(prompt, page) {
  const componentName = page
    ? page.charAt(0).toUpperCase() + page.slice(1).replace(/\s+/g, "")
    : "Page";
  return callGroq(prompt, componentName);
}

export async function regeneratePage(prompt, page) {
  const componentName = page
    ? page.charAt(0).toUpperCase() + page.slice(1).replace(/\s+/g, "")
    : "Page";
  return callGroq(prompt, componentName);
}

// In api.js — new function
export async function inferDomainContext(appName, userPrompt) {
  const res = await fetch(`${BASE}/api/infer-domain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appName, userPrompt }),
  });
  const data = await res.json();
  return data; // { domain, styleHints, colorPalette, layoutNotes }
}