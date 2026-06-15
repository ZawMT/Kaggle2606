import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { fallbackQuestions } from './src/data/fallbackQuestions.js';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini safely (lazy initialization)
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;
  if (!API_KEY || API_KEY === 'MY_GEMINI_API_KEY' || API_KEY.trim() === '') {
    console.log('Gemini API key is not configured or placeholder detected. Falling back to static data.');
    return null;
  }
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return ai;
  } catch (error) {
    console.error('Error initializing GoogleGenAI client:', error);
    return null;
  }
}

// API endpoint for app health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!API_KEY && API_KEY !== 'MY_GEMINI_API_KEY',
    time: new Date().toISOString()
  });
});

// GET list of baseline categories
app.get('/api/quiz/categories', (req, res) => {
  const categories = [
    'Greetings & Basics',
    'Food & Dining',
    'Traveling & Directions',
    'Verbs & Grammar',
    'Daily Routine',
    'Idioms & Expressions'
  ];
  res.json({ categories });
});

// POST endpoint to generate 1 dynamic MCQ using Gemini
app.post('/api/quiz/generate', async (req, res) => {
  const { level = 'beginner', category = 'Greetings & Basics', excludeWords = [] } = req.body;

  const client = getGeminiClient();
  if (!client) {
    // If Gemini client is unavailable, filter and return fallback questions
    console.log('Using fallback questions for:', { level, category });
    
    // Attempt to match category first, then level
    let filtered = fallbackQuestions.filter(
      (q) => q.level === level && q.category.toLowerCase().includes((category || '').toLowerCase())
    );

    // If too few match level + category, level-match first
    if (filtered.length < 1) {
      filtered = fallbackQuestions.filter((q) => q.level === level);
    }

    // Shuffle and pick 1 question (or whatever falls back)
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const finalSelection = shuffled.slice(0, 1).map((q, idx) => ({
      ...q,
      id: `fallback-${Date.now()}-${idx}`
    }));

    return res.json({
      questions: finalSelection,
      isFallback: true,
      message: 'Self-contained response generated successfully'
    });
  }

  try {
    const prompt = `Generate exactly 1 distinct multiple-choice question for learning French vocabulary.
Level: ${level}
Category: ${category}

Instructions:
1. Ensure the French word/expression is authentic and central to the thematic category.
2. Select a word that is suitable for a ${level} level.
3. Keep distractors (wrong choices) plausible and related to English or typical French confusion tricks.
4. One of the options MUST match the correct englishMeaning exactly.
5. Avoid repeating any of these words: ${excludeWords.join(', ')}
6. Provide an elegant phonetic spelling in pronunciationGuide to help English speakers speak it naturally (e.g. [seel voo pleh]).
7. Make the sentence natural, contextual, and helpful for learning.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert French Language Professor crafting a world-class vocabulary quiz. You produce structured JSON arrays containing exactly 1 multiple-choice question aligning with user language levels.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of exactly 1 multiple choice question.",
          items: {
            type: Type.OBJECT,
            properties: {
              frenchWord: { type: Type.STRING, description: "The French term or short phrase." },
              englishMeaning: { type: Type.STRING, description: "The exact correct English translation." },
              sentenceFrench: { type: Type.STRING, description: "A realistic short example sentence in French." },
              sentenceEnglish: { type: Type.STRING, description: "The accurate English translation of that sentence." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of exactly 4 English options. One option must be EnglishMeaning."
              },
              correctIndex: { type: Type.INTEGER, description: "The 0-based index of correct option in options array." },
              explanation: { type: Type.STRING, description: "Brief explanation of the word's nuance, root, or grammatical tips." },
              pronunciationGuide: { type: Type.STRING, description: "Syllable-by-syllable phonetics formatted like [bohn-zhoor]." },
              level: { type: Type.STRING, description: "Should be one of: beginner, intermediate, advanced" },
              category: { type: Type.STRING, description: "The selected category." }
            },
            required: [
              'frenchWord',
              'englishMeaning',
              'sentenceFrench',
              'sentenceEnglish',
              'options',
              'correctIndex',
              'explanation',
              'pronunciationGuide',
              'level',
              'category'
            ]
          }
        }
      }
    });

    const parsedText = response.text || '[]';
    const rawQuestions = JSON.parse(parsedText);
    
    // Inject IDs prior to sending
    const questions = rawQuestions.map((q: any, i: number) => ({
      ...q,
      id: `gemini-${Date.now()}-${i}`
    }));

    return res.json({
      questions,
      isFallback: false
    });
  } catch (error) {
    console.error('Gemini API call failed, pulling fallback questions:', error);

    // Hard fallback
    const filteredFallback = fallbackQuestions.filter(q => q.level === level).slice(0, 1);
    return res.json({
      questions: filteredFallback.map((q, idx) => ({ ...q, id: `fallback-err-${Date.now()}-${idx}` })),
      isFallback: true,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST endpoint to translate any word / sentence or custom vocabulary request
app.post('/api/dictionary/translate', async (req, res) => {
  const { query = '' } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search term is empty.' });
  }

  const client = getGeminiClient();
  if (!client) {
    // Return mock-generated client translation helper if API key is not configured
    console.log('No Gemini API key for translation, providing calculated mock response.');
    
    const queryLower = query.trim().toLowerCase();
    
    // Let's see if we can locate this in fallback
    const match = fallbackQuestions.find(q => q.frenchWord.toLowerCase() === queryLower);
    
    if (match) {
      return res.json({
        frenchWord: match.frenchWord,
        englishMeaning: match.englishMeaning,
        sentenceFrench: match.sentenceFrench,
        sentenceEnglish: match.sentenceEnglish,
        pronunciationGuide: match.pronunciationGuide,
        category: match.category,
        level: match.level,
        notes: match.explanation,
        isFallback: true
      });
    }

    // Generate smart local translation helper
    return res.json({
      frenchWord: query,
      englishMeaning: `Meaning of "${query}" (Set your Gemini key to unlock full dynamic translations)`,
      sentenceFrench: `C'est le mot "${query}" dans une phrase.`,
      sentenceEnglish: `This is the word "${query}" in a sentence.`,
      pronunciationGuide: `[${query.toLowerCase()}]`,
      category: "User Contribution",
      level: "beginner",
      notes: "Please add your Gemini API Key in Settings > Secrets to unlock auto-pronunciation, sentence creation, and grammatical breakdowns.",
      isFallback: true
    });
  }

  try {
    const prompt = `Translate this French terms or phrase into English: "${query}".
Analyze the term and return rich dictionary metadata.
Verify spelling. If misspelled, replace with the correct French spelling.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a French dictionary compiler. Translate the phrase, find its phonetic key, categorize it, detect learning level (beginner/intermediate/advanced), and add helpful learning notes.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frenchWord: { type: Type.STRING, description: "Corrected French term/phrase spelling." },
            englishMeaning: { type: Type.STRING, description: "Clean translation to English." },
            sentenceFrench: { type: Type.STRING, description: "A simple natural French example sentence." },
            sentenceEnglish: { type: Type.STRING, description: "English translation of that sentence." },
            pronunciationGuide: { type: Type.STRING, description: "Phonetic breakdown like [bohn-zhoor]." },
            category: { type: Type.STRING, description: "A sensible thematic category (e.g. food, verbs, greeting, traveling)." },
            level: { type: Type.STRING, description: "Suitable learner level: beginner, intermediate, advanced" },
            notes: { type: Type.STRING, description: "Memory trick, grammar insight or gender note (masculine/feminine)." }
          },
          required: [
            'frenchWord',
            'englishMeaning',
            'sentenceFrench',
            'sentenceEnglish',
            'pronunciationGuide',
            'category',
            'level',
            'notes'
          ]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return res.json(result);
  } catch (error) {
    console.error('Translation failed:', error);
    return res.status(500).json({
      error: 'Failure to translate term.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});


// Handle building Vite and serving static assets
async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Use createViteServer inside development mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Listen on all interfaces on external 3000 port
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap server:', err);
});
