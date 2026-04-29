/**
 * routes/roadmap.js
 * POST /roadmap
 * Generate a personalised 4-phase career roadmap for a given domain.
 */

const { Router }     = require("express");
const { geminiJSON } = require("../utils/gemini");

const router = Router();

// ─── FALLBACK ─────────────────────────────────────────────────────────────────
const fallback = (domain) => [
  {
    phase:     "Phase 1: Foundation",
    duration:  "4–6 weeks",
    desc:      `Build strong fundamentals in ${domain}. Study core concepts daily for 1–2 hours.`,
    resources: ["YouTube tutorials", "freeCodeCamp", "Official documentation"],
    milestone: "Can explain core concepts confidently in an interview.",
  },
  {
    phase:     "Phase 2: Specialisation",
    duration:  "6–8 weeks",
    desc:      "Go deep on the key tools and frameworks used in industry. Follow structured courses.",
    resources: ["Udemy courses", "GitHub open-source projects", "Official docs"],
    milestone: "Built 1–2 small working projects from scratch.",
  },
  {
    phase:     "Phase 3: Portfolio Building",
    duration:  "4–6 weeks",
    desc:      "Build and deploy 2–3 real-world projects. Publish everything on GitHub with good READMEs.",
    resources: ["GitHub", "Vercel / Netlify / Railway", "Kaggle / HuggingFace"],
    milestone: "Public portfolio ready to share with employers.",
  },
  {
    phase:     "Phase 4: Industry Ready",
    duration:  "Ongoing",
    desc:      "Apply for jobs and internships, do mock interviews weekly, and earn a relevant certification.",
    resources: ["LinkedIn", "Naukri / Internshala", "LeetCode", "AWS / Google certifications"],
    milestone: "First job offer or paid internship secured.",
  },
];

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM = `You are a career roadmap expert for the Indian tech job market.
Generate a personalised 4-phase learning roadmap. Return a JSON array of exactly 4 objects:
[
  {
    "phase":     "Phase 1: <title>",
    "duration":  "<e.g. 4-6 weeks>",
    "desc":      "<2-3 sentence description of what to learn and do>",
    "resources": ["<free resource 1>", "<resource 2>", "<resource 3>"],
    "milestone": "<what the candidate can do/show after this phase>"
  }
]
Make it specific, actionable, and targeted at Indian students aiming for top product companies.`;

// ─── HANDLER ──────────────────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { domain, current_skills = "" } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "domain is required." });
    }

    const context = current_skills
      ? `\nCandidate's current skills: ${current_skills}`
      : "";

    const result = await geminiJSON(SYSTEM, `Generate a roadmap for: ${domain}${context}`);
    return res.json(result || fallback(domain));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
