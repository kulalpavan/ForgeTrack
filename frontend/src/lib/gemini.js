import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    '[ForgeTrack] Gemini API key missing. Set VITE_GEMINI_API_KEY in .env.local. Needed for Phase 4 CSV Import Agent.'
  );
}

// Stub — Gemini client initialized here. Logic added in Phase 4.
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Get a Gemini model configured for deterministic JSON output.
 * Used in Phase 4 CSV column mapping agent.
 */
export function getJsonModel(modelName = 'gemini-2.0-flash') {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.local');
  }
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0, // deterministic mapping
    },
  });
}
