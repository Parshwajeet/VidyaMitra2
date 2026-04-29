/**
 * utils/gemini.js
 * Thin wrapper around Google Gemini SDK.
 * Provides geminiJSON() and geminiText() helpers used by all routes.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL  = "gemini-1.5-flash"; // Free tier model

/**
 * Call Gemini and parse the response as JSON.
 * @param {string} system     - System / context prompt
 * @param {string} userMsg    - User message
 * @returns {object|array|null} Parsed JSON or null on failure
 */
async function geminiJSON(system, userMsg) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = `${system}

IMPORTANT: Respond ONLY with raw JSON. No markdown, no backticks, no explanation, no extra text.

${userMsg}`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    // Strip accidental markdown fences
    raw = raw.replace(/```json|```/g, "").trim();

    return JSON.parse(raw);
  } catch (err) {
    console.error("[geminiJSON error]", err.message);
    return null;
  }
}

/**
 * Call Gemini with a conversation history and return plain text.
 * @param {string} system    - System prompt
 * @param {Array}  messages  - [{role, content}, ...]  (role: "user" | "assistant")
 * @returns {string} Gemini's text reply
 */
async function geminiText(system, messages) {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: system,
    });

    // Convert messages to Gemini chat format
    // Gemini uses "user" and "model" roles (not "assistant")
    const history = messages.slice(0, -1).map((m) => ({
      role:  m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });

    // Last message is the current user input
    const lastMsg = messages[messages.length - 1];
    const result  = await chat.sendMessage(lastMsg.content);

    return result.response.text();
  } catch (err) {
    console.error("[geminiText error]", err.message);
    return "I'm having trouble connecting to AI right now. Please try again.";
  }
}

module.exports = { geminiJSON, geminiText };
