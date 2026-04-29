/**
 * routes/interview.js
 * POST /get-questions      — Generate 5 interview questions (3 technical + 2 HR)
 * POST /evaluate-interview — AI-evaluate a set of Q&A pairs and return score + feedback
 */

const { Router }     = require("express");
const { geminiJSON } = require("../utils/gemini");

const router = Router();

// ─── FALLBACK QUESTIONS ───────────────────────────────────────────────────────
const fallbackQuestions = (domain) => [
  { type: "technical", q: `Explain a core concept in ${domain} that you use regularly.`,      hint: "Look for depth and real-world application." },
  { type: "technical", q: "Walk me through how you would debug a production issue.",           hint: "Systematic thinking and tools used." },
  { type: "technical", q: "What design pattern do you find most useful and why?",             hint: "Practical knowledge over memorisation." },
  { type: "hr",        q: "Tell me about your most challenging project and how you handled it.", hint: "STAR format: Situation, Task, Action, Result." },
  { type: "hr",        q: "Where do you see yourself in 2 years?",                            hint: "Alignment with role and realistic ambition." },
];

// ── POST /get-questions ───────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { domain = "Web Development", level = "Intermediate" } = req.body;

    const result = await geminiJSON(
      `You are a senior technical interviewer. Generate exactly 5 interview questions
(3 technical, 2 HR/behavioural) for the given domain and difficulty level.
Return a JSON array of objects:
[
  {"type": "technical", "q": "<question>", "hint": "<1 sentence interviewer expectation>"},
  {"type": "hr",        "q": "<question>", "hint": "<what a good answer covers>"}
]
Make questions realistic, specific, and appropriate for the level.`,
      `Domain: ${domain}\nLevel: ${level}\nGenerate 5 interview questions.`
    );

    return res.json(result || fallbackQuestions(domain));
  } catch (err) {
    next(err);
  }
});

// ── POST /evaluate-interview ──────────────────────────────────────────────────
router.post("/evaluate-interview", async (req, res, next) => {
  try {
    const { domain = "Web Development", qa_pairs = [] } = req.body;

    if (!qa_pairs.length) {
      return res.status(400).json({ error: "qa_pairs cannot be empty." });
    }

    const qaText = qa_pairs
      .map((pair, i) => `Q${i + 1}: ${pair.q}\nAnswer: ${pair.a}`)
      .join("\n\n");

    const result = await geminiJSON(
      `You are an expert technical interviewer for ${domain} roles.
Evaluate the candidate's interview answers and return a JSON object:
{
  "score": <integer 0-100>,
  "comment": "<2-3 sentence honest overall assessment>",
  "strengths": ["<demonstrated strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area to improve 1>", "<area 2>", "<area 3>"],
  "questionFeedback": [
    {"q": "<question>", "rating": <1-5>, "feedback": "<specific feedback>"}
  ]
}
Be honest but constructive. Score based on technical accuracy, communication clarity, and depth.`,
      `Evaluate these interview responses:\n\n${qaText.slice(0, 3000)}`,
      1000
    );

    if (!result) {
      const baseScore = Math.min(100, qa_pairs.length * 15 + Math.floor(Math.random() * 25) + 10);
      return res.json({
        score:    baseScore,
        comment:  "You showed effort in your responses. Focus on adding more technical depth and concrete examples.",
        strengths:    ["Attempted all questions", "Basic domain knowledge"],
        improvements: ["Add specific technical examples", "Use the STAR framework for HR questions", "Go deeper on implementation details"],
        questionFeedback: [],
      });
    }

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
