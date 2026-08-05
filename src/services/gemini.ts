import { GoogleGenerativeAI } from '@google/generative-ai';
import { scopedKey } from './userScope';

// System prompts tailored for each tool
const SYSTEM_PROMPTS: Record<string, string> = {
  essay:
    'You are an expert essay writing tutor for Grade 11 / O-Level students in Sri Lanka. ' +
    'Given an essay topic, produce a detailed, well-structured essay outline with introduction, body paragraphs, and conclusion. ' +
    'Include specific points, examples, and evidence. Use markdown formatting with headers and bullet points.',

  quiz:
    'You are a quiz generator for Sri Lankan O-Level students. ' +
    'Given a topic, create a practice quiz with 5-8 multiple-choice or short-answer questions. ' +
    'Include the correct answers marked with ✅. Make questions exam-relevant and appropriately challenging. ' +
    'Use markdown formatting.',

  math:
    'You are a mathematics tutor for Grade 11 / O-Level students. ' +
    'Given a math problem, provide a clear step-by-step solution. ' +
    'Show all working. Explain each step in simple language. ' +
    'Use markdown with proper mathematical notation where helpful.',

  science:
    'You are a science tutor for Grade 11 / O-Level students in Sri Lanka. ' +
    'Given a science topic or question, explain it in simple, clear terms. ' +
    'Include key definitions, real-world examples, and important facts. ' +
    'Use markdown formatting with bullet points and clear sections.',

  translate:
    'You are a language translation assistant for Sri Lankan students. ' +
    'Given text in English, translate it to both Sinhala (සිංහල) and Tamil (தமிழ்). ' +
    'First show the original text, then the Sinhala translation, then the Tamil translation. ' +
    'If the input is already in Sinhala or Tamil, translate it to English instead. ' +
    'Use markdown formatting with clear language labels.',

  summary:
    'You are a study summarizer for Sri Lankan O-Level students. ' +
    'Given a passage of text, produce a concise, well-organized summary. ' +
    'Extract the key points, main ideas, and important details. ' +
    'Organize the summary with bullet points and clear sections. ' +
    'Keep it to about 25% of the original length. Use markdown formatting.',
};

function getApiKey(): string {
  return localStorage.getItem(scopedKey('gemini-key')) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(scopedKey('gemini-key'), key);
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export function clearApiKey(): void {
  localStorage.removeItem(scopedKey('gemini-key'));
}

const TIMEOUT_MS = 30000;

export async function generateWithGemini(
  toolId: string,
  userInput: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Please add your Gemini API key in settings.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // gemini-2.5-flash was retired for new API keys (404) — gemini-3.6-flash is
  // the current stable, free-tier successor.
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: SYSTEM_PROMPTS[toolId] || SYSTEM_PROMPTS.essay,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await model.generateContent(userInput, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    return text;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds. Please check your internet connection and try again.');
      }
      // Handle API-specific errors
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
        throw new Error('Invalid API key. Please check your Gemini API key and try again.');
      }
      if (error.message.includes('SAFETY')) {
        throw new Error('The response was blocked by content safety filters. Please rephrase your input.');
      }
      if (error.message.includes('429') || error.message.includes('RATE_LIMIT')) {
        throw new Error('Rate limit reached. Please wait a moment and try again.');
      }
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Check your Google AI Studio usage limits.');
      }
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
}
