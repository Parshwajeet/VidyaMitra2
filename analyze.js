/**
 * routes/analyze.js
 * POST /analyze
 * Analyses resume/skills text → ATS score, gaps, strengths, roadmap, keywords, job roles
 */

const { Router }     = require("express");
const { geminiJSON } = require("../utils/gemini");

const router = Router();

// ─── FALLBACK (when AI call fails) ───────────────────────────────────────────
const FALLBACK = {
  score: 45,
  advice:
    "Your profile shows some relevant skills. Add more quantified achievements and industry keywords to improve your ATS score significantly.",
  gaps: ["Cloud Computing", "System Design", "API Development", "Docker/DevOps"],
  strengths: ["Programming Fundamentals", "Problem Solving"],
  skillBreakdown: [
    { name: "Technical Skills",   score: 50 },
    { name: "Project Experience", score: 40 },
    { name: "Certifications",     score: 20 },
    { name: "Communication",      score: 60 },
  ],
  roadmap: [
    { phase: "Phase 1: Foundation",    desc: "Strengthen your core programming and CS fundamentals." },
    { phase: "Phase 2: Specialisation",desc: "Pick one domain and go deep — build real projects." },
    { phase: "Phase 3: Portfolio",     desc: "Deploy 2–3 full projects publicly on GitHub." },
    { phase: "Phase 4: Industry Ready",desc: "Get certified and start applying with a polished resume." },
  ],
  keywords: ["REST API", "Cloud", "Docker", "CI/CD", "Agile"],
  jobRoles: ["Junior Developer", "Software Engineer Trainee", "Technical Analyst"],
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM = `You are an expert ATS resume analyser and career coach for the Indian job market.
Analyse the provided resume or skills text and return a JSON object with exactly these fields:
{
  "score": <integer 0-100, ATS readiness score>,
  "advice": "<2-3 sentence personalised overall advice>",
  "gaps": ["<missing skill 1>", "<missing skill 2>", ...],
  "strengths": ["<strong area 1>", "<strong area 2>", ...],
  "skillBreakdown": [
    {"name": "<skill category>", "score": <0-100>},
    {"name": "<skill category>", "score": <0-100>},
    {"name": "<skill category>", "score": <0-100>},
    {"name": "<skill category>", "score": <0-100>}
  ],
  "roadmap": [
    {"phase": "Phase 1: Foundation",     "desc": "<what to learn/do>"},
    {"phase": "Phase 2: Specialisation", "desc": "<what to learn/do>"},
    {"phase": "Phase 3: Portfolio Building","desc": "<what to build>"},
    {"phase": "Phase 4: Industry Ready", "desc": "<certifications/jobs to target>"}
  ],
  "keywords": ["<ATS keyword 1>", "<ATS keyword 2>", ...],
  "jobRoles": ["<suitable job role 1>", "<suitable job role 2>", "<suitable job role 3>"]
}
Keep gaps and strengths to 3–5 items each. Keywords should be 5–8 industry-relevant terms missing from their resume.`;

// ─── HANDLER ──────────────────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Resume text cannot be empty." });
    }

    const result = await geminiJSON(SYSTEM, `Analyse this resume:\n\n${text.slice(0, 4000)}`);
    return res.json(result || FALLBACK);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
