export interface Question {
  id: string;
  frenchWord: string;
  englishMeaning: string;
  sentenceFrench: string;
  sentenceEnglish: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  pronunciationGuide: string;
}

export interface DictionaryEntry {
  id: string;
  frenchWord: string;
  englishMeaning: string;
  sentenceFrench: string;
  sentenceEnglish: string;
  pronunciationGuide: string;
  category: string;
  level: string;
  savedAt: string;
  notes?: string;
}

export interface QuizSessionState {
  currentQuestionIndex: number;
  selectedAnswerIndex: number | null;
  isAnswerSubmitted: boolean;
  score: number;
  questions: Question[];
  finished: boolean;
}
