import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Bookmark, BookmarkCheck, Volume2, Settings, RefreshCcw } from 'lucide-react';
import { Question, DictionaryEntry } from '../types.js';

interface QuizCardProps {
  onSaveToDictionary: (entry: Omit<DictionaryEntry, 'id' | 'savedAt'>) => void;
  savedWordsSet: Set<string>;
}

export default function QuizCard({ onSaveToDictionary, savedWordsSet }: QuizCardProps) {
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [category, setCategory] = useState<string>('Greetings & Basics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quiz session states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isGenAi, setIsGenAi] = useState(true);

  const categories = [
    'Greetings & Basics',
    'Food & Dining',
    'Traveling & Directions',
    'Verbs & Grammar',
    'Daily Routine',
    'Idioms & Expressions'
  ];

  const handleStartQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          category,
          excludeWords: Array.from(savedWordsSet)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz questions from API server.');
      }

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setSelectedIdx(null);
        setIsSubmitted(false);
        setScore(0);
        setQuizFinished(false);
        setIsGenAi(!data.isFallback);
      } else {
        throw new Error('No quiz questions returned from database. Please change level or selection.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isSubmitted) return;
    setSelectedIdx(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedIdx === null || isSubmitted) return;
    
    setIsSubmitted(true);
    if (selectedIdx === currentQuestion.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedIdx(null);
    setIsSubmitted(false);
    handleStartQuiz();
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentQuestion = questions[currentIndex];
  const isSaved = currentQuestion && savedWordsSet.has(currentQuestion.frenchWord.toLowerCase());

  const handleSaveCurrentWord = () => {
    if (!currentQuestion) return;
    onSaveToDictionary({
      frenchWord: currentQuestion.frenchWord,
      englishMeaning: currentQuestion.englishMeaning,
      sentenceFrench: currentQuestion.sentenceFrench,
      sentenceEnglish: currentQuestion.sentenceEnglish,
      pronunciationGuide: currentQuestion.pronunciationGuide,
      category: currentQuestion.category,
      level: currentQuestion.level,
      notes: currentQuestion.explanation
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto" id="quiz-panel-container">
      <AnimatePresence mode="wait">
        {questions.length === 0 ? (
          // Setup panel
          <motion.div
            key="quiz-setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass rounded-3xl p-6 md:p-8"
            id="quiz-setup-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/10 text-pink-300 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">Vocabulary MCQ Arena</h2>
                <p className="text-xs text-indigo-200 opacity-80">Pick options to generate a dynamic translation & comprehension challenge.</p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg text-sm mb-5" id="quiz-error-msg">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Level selection */}
              <div>
                <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2.5">Learner Tier Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      id={`level-button-${lvl}`}
                      onClick={() => setLevel(lvl)}
                      type="button"
                      className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all text-center capitalize cursor-pointer ${
                        level === lvl
                          ? 'border-white bg-white/20 text-white shadow-md ring-1 ring-white/30'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-indigo-150'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2.5">Thematic Vocabulary Focus</label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      id={`category-button-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setCategory(cat)}
                      type="button"
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        category === cat
                          ? 'border-white bg-white/20 text-white font-bold'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-indigo-150'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                id="start-quiz-submit"
                onClick={handleStartQuiz}
                disabled={loading}
                className="w-full mt-2 py-3.5 px-5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                    Generating Custom Challenge...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-pink-200 animate-pulse" />
                    Generate Vocabulary Question
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          // Active question taking panel
          <motion.div
            key={loading ? 'loading-card' : `question-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="glass rounded-3xl overflow-hidden min-h-[350px] flex flex-col justify-between"
            id="active-question-card"
          >
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center flex-1">
                <RefreshCcw className="w-10 h-10 text-pink-300 animate-spin mb-4" />
                <p className="text-sm font-semibold text-white">Professor is preparing the next word...</p>
                <p className="text-xs text-indigo-200 opacity-60 mt-1">Generating instant, contextual translation quiz</p>
              </div>
            ) : (
              <>
                {/* Header progress info */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-pink-500/20 border border-pink-400/35 text-pink-200 px-2.5 py-1 rounded-md uppercase">
                      {level}
                    </span>
                    <span className="text-xs text-indigo-100 font-medium truncate max-w-[150px]">
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuestions([])}
                      className="text-[10px] font-bold text-indigo-200 hover:text-white transition-colors flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 py-1 px-2.5 rounded-lg cursor-pointer"
                      title="Configure new level or theme"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Change Topic</span>
                    </button>
                    {isGenAi ? (
                      <span className="text-[10px] font-bold text-pink-200 bg-pink-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs border border-pink-400/20 animate-pulse">
                        <Sparkles className="w-3 h-3" /> Live AI
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-indigo-200 bg-white/15 px-2.5 py-1 rounded-md">
                        Baseline
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 h-1"></div>

                <div className="p-6 md:p-8">
                  {/* French Word Segment */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 mb-1.5 shadow-sm">
                      <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{currentQuestion.frenchWord}</span>
                      <button
                        type="button"
                        onClick={() => handleSpeak(currentQuestion.frenchWord)}
                        title="Listen to natural French pronunciation"
                        className="p-1 px-1.5 hover:bg-white/10 rounded-md text-pink-300 border border-white/15 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Volume2 className="w-4 h-4 shrink-0" />
                        <span className="text-[9px] font-bold font-mono tracking-wider">FR</span>
                      </button>
                    </div>
                    
                    <p className="text-xs font-mono text-pink-300 mb-5">
                      Phonetic: <span className="font-bold underline">{currentQuestion.pronunciationGuide || '[phonétique]'}</span>
                    </p>

                    {/* French Sentence context panel */}
                    <div className="glass-card rounded-xl p-4 inline-block max-w-xl text-left w-full">
                      <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">Context sentence:</p>
                      <p className="text-sm italic font-medium text-white">
                        "{currentQuestion.sentenceFrench}"
                      </p>
                      {isSubmitted && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-indigo-200 mt-2 pt-2 border-t border-white/5 opacity-80"
                        >
                          Translation: "{currentQuestion.sentenceEnglish}"
                        </motion.p>
                      )}
                    </div>
                  </div>

                  {/* Translation options list */}
                  <div className="space-y-3 mb-6">
                    <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Select the correct English translation:</label>
                    
                    {currentQuestion.options.map((opt, idx) => {
                      let optStyle = 'border-white/10 bg-white/5 hover:bg-white/10 text-indigo-100';
                      let iconElement = <HelpCircle className="w-4 h-4 text-indigo-300/60 shrink-0" />;

                      if (isSubmitted) {
                        if (idx === currentQuestion.correctIndex) {
                          optStyle = 'border-emerald-400 bg-emerald-500/20 text-emerald-100 font-bold ring-1 ring-emerald-400/40';
                          iconElement = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
                        } else if (idx === selectedIdx) {
                          optStyle = 'border-rose-400 bg-rose-500/20 text-rose-105 ring-1 ring-rose-400/40';
                          iconElement = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
                        } else {
                          optStyle = 'border-white/5 bg-white/2 opacity-35 text-indigo-200/50';
                          iconElement = null;
                        }
                      } else if (selectedIdx === idx) {
                        optStyle = 'border-pink-400 bg-white/20 text-white font-bold ring-2 ring-pink-500/20';
                        iconElement = <div className="w-4 h-4 rounded-full border-4 border-pink-400 shrink-0" />;
                      }

                      return (
                        <button
                          key={idx}
                          id={`quiz-option-${currentIndex}-${idx}`}
                          onClick={() => handleSelectOption(idx)}
                          disabled={isSubmitted}
                          type="button"
                          className={`w-full p-4 rounded-xl border text-sm text-left transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                        >
                          <span>{opt}</span>
                          {iconElement}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation panel */}
                  <AnimatePresence>
                    {isSubmitted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/5 border border-white/15 rounded-xl p-4 mb-6"
                        id="explanation-box"
                      >
                        <div className="flex justify-between items-center gap-4 mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300">Professor's Insight</h4>
                          
                          {/* Save to dictionary button integrated */}
                          <button
                            type="button"
                            id="save-to-dictionary-btn"
                            onClick={handleSaveCurrentWord}
                            className={`text-[10px] py-1 px-3 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              isSaved
                                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-250 hover:bg-emerald-500/30'
                                : 'bg-white/10 border-white/10 hover:bg-white/15 text-indigo-100'
                            }`}
                          >
                            {isSaved ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Saved to Dict
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3.5 h-3.5 text-pink-300" />
                                Add to My Dict
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-indigo-105 font-normal leading-relaxed">
                          {currentQuestion.explanation}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Trigger Buttons */}
                  <div className="flex gap-4">
                    {!isSubmitted ? (
                      <button
                        type="button"
                        id="submit-answer-cmd"
                        onClick={handleSubmitAnswer}
                        disabled={selectedIdx === null}
                        className="w-full py-3 px-5 bg-gradient-to-r from-pink-550 to-indigo-600 disabled:opacity-40 text-white font-bold rounded-xl hover:opacity-90 shadow-md focus:outline-hidden transition-all flex items-center justify-center cursor-pointer"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        id="next-question-cmd"
                        onClick={handleNext}
                        className="w-full py-3 px-5 bg-white text-indigo-900 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md hover:bg-indigo-50 transition-all"
                      >
                        Continue to Next Word
                        <ArrowRight className="w-4 h-4 text-indigo-900" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
