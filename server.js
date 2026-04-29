/**
 * VidyaMitra Backend — Node.js / Express (Single File)
 * Powered by Google Gemini API (Free Tier)
 * Start: node server.js
 */

require("dotenv").config({ path: __dirname + "/.env" });
require("dotenv").config({ path: __dirname + "/runtime.env" });

const express = require("express");
const cors    = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app   = express();
const PORT  = process.env.PORT || 8010;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = "gemini-1.5-flash";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}]  ${req.method}  ${req.path}`);
  next();
});

// ─── GEMINI HELPERS ───────────────────────────────────────────────────────────
async function geminiJSON(system, userMsg) {
  try {
    const model  = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `${system}\n\nIMPORTANT: Respond ONLY with raw JSON. No markdown, no backticks, no explanation.\n\n${userMsg}`;
    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    raw = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(raw);
  } catch (err) {
    console.error("[geminiJSON error]", err.message);
    return null;
  }
}

async function geminiText(system, messages) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: system });
    const history = messages.slice(0, -1).map((m) => ({
      role:  m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chat   = model.startChat({ history });
    const result = await chat.sendMessage(messages[messages.length - 1].content);
    return result.response.text();
  } catch (err) {
    console.error("[geminiText error]", err.message);
    return "I'm having trouble connecting to AI right now. Please try again.";
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "VidyaMitra API is running", version: "1.0.0", ai: "Google Gemini" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 1. RESUME ANALYSER
app.post("/evaluate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Resume text cannot be empty." });
    const result = await geminiJSON(
      `You are an expert ATS resume analyser for the Indian job market. Analyse the resume and return JSON:
{"score":<0-100>,"advice":"<2-3 sentences>","gaps":["<skill>","<skill>","<skill>"],"strengths":["<skill>","<skill>","<skill>"],"skillBreakdown":[{"name":"Technical Skills","score":<0-100>},{"name":"Project Experience","score":<0-100>},{"name":"Certifications","score":<0-100>},{"name":"Communication","score":<0-100>}],"roadmap":[{"phase":"Phase 1: Foundation","desc":"<desc>"},{"phase":"Phase 2: Specialisation","desc":"<desc>"},{"phase":"Phase 3: Portfolio Building","desc":"<desc>"},{"phase":"Phase 4: Industry Ready","desc":"<desc>"}],"keywords":["<kw>","<kw>","<kw>","<kw>","<kw>"],"jobRoles":["<role>","<role>","<role>"]}`,
      `Analyse this resume:\n\n${text.slice(0, 4000)}`
    );
    res.json(result || { score:45, advice:"Add more keywords and quantified achievements.", gaps:["Cloud","Docker","System Design"], strengths:["Programming","Problem Solving"], skillBreakdown:[{name:"Technical Skills",score:50},{name:"Project Experience",score:40},{name:"Certifications",score:20},{name:"Communication",score:60}], roadmap:[{phase:"Phase 1: Foundation",desc:"Strengthen CS fundamentals."},{phase:"Phase 2: Specialisation",desc:"Go deep in one domain."},{phase:"Phase 3: Portfolio Building",desc:"Deploy projects on GitHub."},{phase:"Phase 4: Industry Ready",desc:"Get certified and apply."}], keywords:["REST API","Cloud","Docker","CI/CD","Agile"], jobRoles:["Junior Developer","Software Engineer","Technical Analyst"] });
  } catch (err) { res.status(500).json({ error: "Analysis failed." }); }
});

// 2. CHATBOT
app.post("/chat", async (req, res) => {
  try {
    const { text, history = [] } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Message cannot be empty." });
    const system = `You are VidyaMitra, an expert AI career coach for Indian students. Give concise practical advice about resumes, career paths, interview prep, and job market trends. Keep responses under 200 words. Be friendly and specific.`;
    const messages = [...history.slice(-8), { role: "user", content: text }];
    const reply = await geminiText(system, messages);
    res.json({ reply });
  } catch (err) { res.status(500).json({ error: "Chat failed." }); }
});

// 3. INTERVIEW QUESTIONS
app.post("/get-questions", async (req, res) => {
  try {
    const { domain = "Web Development", level = "Intermediate" } = req.body;
    const result = await geminiJSON(
      `You are a senior technical interviewer. Generate exactly 5 interview questions (3 technical, 2 HR) for the domain and level. Return a JSON array: [{"type":"technical","q":"<question>","hint":"<hint>"},{"type":"hr","q":"<question>","hint":"<hint>"}]`,
      `Domain: ${domain}\nLevel: ${level}`
    );
    res.json(result || [
      {type:"technical",q:`Explain a core concept in ${domain}.`,hint:"Look for depth."},
      {type:"technical",q:"How do you debug a production issue?",hint:"Systematic thinking."},
      {type:"technical",q:"What design pattern do you prefer?",hint:"Practical knowledge."},
      {type:"hr",q:"Tell me about your most challenging project.",hint:"STAR format."},
      {type:"hr",q:"Where do you see yourself in 2 years?",hint:"Realistic ambition."},
    ]);
  } catch (err) { res.status(500).json({ error: "Failed to generate questions." }); }
});

// 4. INTERVIEW EVALUATION
app.post("/evaluate-interview", async (req, res) => {
  try {
    const { domain = "Web Development", qa_pairs = [] } = req.body;
    if (!qa_pairs.length) return res.status(400).json({ error: "qa_pairs cannot be empty." });
    const qaText = qa_pairs.map((p, i) => `Q${i+1}: ${p.q}\nAnswer: ${p.a}`).join("\n\n");
    const result = await geminiJSON(
      `You are an expert interviewer for ${domain}. Evaluate answers and return JSON: {"score":<0-100>,"comment":"<2-3 sentences>","strengths":["<s1>","<s2>","<s3>"],"improvements":["<i1>","<i2>","<i3>"],"questionFeedback":[{"q":"<q>","rating":<1-5>,"feedback":"<feedback>"}]}`,
      `Evaluate:\n\n${qaText.slice(0, 3000)}`
    );
    const score = Math.min(100, qa_pairs.length * 15 + Math.floor(Math.random() * 25) + 10);
    res.json(result || { score, comment:"You showed effort. Focus on technical depth.", strengths:["Attempted all questions","Basic knowledge"], improvements:["Add specific examples","Use STAR framework","Go deeper on implementation"], questionFeedback:[] });
  } catch (err) { res.status(500).json({ error: "Evaluation failed." }); }
});

// 5. CAREER ROADMAP
app.post("/roadmap", async (req, res) => {
  try {
    const { domain, current_skills = "" } = req.body;
    if (!domain) return res.status(400).json({ error: "domain is required." });
    const context = current_skills ? `\nCurrent skills: ${current_skills}` : "";
    const result = await geminiJSON(
      `You are a career roadmap expert for Indian tech students. Return a JSON array of exactly 4 objects: [{"phase":"Phase 1: <title>","duration":"<weeks>","desc":"<2-3 sentences>","resources":["<r1>","<r2>","<r3>"],"milestone":"<what they can do>"}]`,
      `Roadmap for: ${domain}${context}`
    );
    res.json(result || [
      {phase:"Phase 1: Foundation",duration:"4-6 weeks",desc:`Build fundamentals in ${domain}.`,resources:["YouTube","freeCodeCamp","Official docs"],milestone:"Explain core concepts."},
      {phase:"Phase 2: Specialisation",duration:"6-8 weeks",desc:"Go deep on key frameworks.",resources:["Udemy","GitHub","Official docs"],milestone:"Built 1-2 projects."},
      {phase:"Phase 3: Portfolio",duration:"4-6 weeks",desc:"Deploy 2-3 real projects.",resources:["GitHub","Vercel","Netlify"],milestone:"Portfolio ready."},
      {phase:"Phase 4: Industry Ready",duration:"Ongoing",desc:"Apply for jobs and get certified.",resources:["LinkedIn","Naukri","LeetCode"],milestone:"First job offer."},
    ]);
  } catch (err) { res.status(500).json({ error: "Roadmap generation failed." }); }
});

// 6. ASSESSMENT QUESTIONS
app.get("/assessment-questions/:domain", async (req, res) => {
  try {
    const domain = decodeURIComponent(req.params.domain);
    const result = await geminiJSON(
      `You are a quiz creator. Generate 5 MCQ questions for the domain. Return JSON array: [{"q":"<question>","options":["<A>","<B>","<C>","<D>"],"correct":<0-3>,"explanation":"<1 sentence>"}]`,
      `5 MCQ questions for: ${domain}`
    );
    res.json(result || [{q:`Core concept in ${domain}?`,options:["Option A","Option B","Option C","Option D"],correct:0,explanation:"This is the correct answer."}]);
  } catch (err) { res.status(500).json({ error: "Failed to generate questions." }); }
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 VidyaMitra API  →  http://localhost:${PORT}`);
  console.log(`   AI Provider     →  Google Gemini (Free)`);
  console.log(`   Press Ctrl+C to stop\n`);
});
