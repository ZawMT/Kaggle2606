import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Trophy, Sparkles, Smile, Bookmark, Flame, Star, Activity, Languages, Check, ArrowUpRight, HelpCircle } from 'lucide-react';
import QuizCard from './components/QuizCard.js';
import DictionaryView from './components/DictionaryView.js';
import { DictionaryEntry } from './types.js';

export default function App() {
  const [currentView, setCurrentView] = useState<'quiz' | 'dictionary'>('quiz');
  
  // Local Dictionary Persistence
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('french_dic_entries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Learner stats persistence
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('french_dic_stats');
      return saved ? JSON.parse(saved) : { streak: 0, highStreak: 0, masteredWords: 0 };
    } catch {
      return { streak: 0, highStreak: 0, masteredWords: 0 };
    }
  });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('french_dic_entries', JSON.stringify(dictionary));
  }, [dictionary]);

  useEffect(() => {
    localStorage.setItem('french_dic_stats', JSON.stringify(stats));
  }, [stats]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 2500);
  };

  const handleSaveToDictionary = (entry: Omit<DictionaryEntry, 'id' | 'savedAt'>) => {
    const isAlreadySaved = dictionary.some(
      (e) => e.frenchWord.toLowerCase() === entry.frenchWord.toLowerCase()
    );

    if (isAlreadySaved) {
      triggerNotification(`"${entry.frenchWord}" is already in your dictionary.`);
      return;
    }

    const newEntry: DictionaryEntry = {
      ...entry,
      id: `entry-${Date.now()}`,
      savedAt: new Date().toISOString()
    };

    setDictionary((prev) => [newEntry, ...prev]);
    setStats((prev: any) => ({
      ...prev,
      masteredWords: prev.masteredWords + 1,
      streak: prev.streak + 1,
      highStreak: Math.max(prev.highStreak, prev.streak + 1)
    }));

    triggerNotification(`Added "${entry.frenchWord}" to your personal dictionary!`);
  };

  const handleDeleteEntry = (id: string) => {
    const entry = dictionary.find(e => e.id === id);
    setDictionary((prev) => prev.filter((item) => item.id !== id));
    setStats((prev: any) => ({
      ...prev,
      masteredWords: Math.max(0, prev.masteredWords - 1)
    }));
    if (entry) {
      triggerNotification(`Removed "${entry.frenchWord}" from dictionary.`);
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setDictionary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
    triggerNotification('Grammar core notes updated!');
  };

  const savedWordsSet = new Set<string>(dictionary.map((e) => e.frenchWord.toLowerCase()));

  return (
    <div className="min-h-screen mesh-bg text-white flex flex-col font-sans" id="app-root-container">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1e1b4b]/95 border border-white/20 text-white shadow-2xl px-5 py-3 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-md"
            id="toast-notification"
          >
            <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Space */}
      <header className="border-b border-white/10" id="main-header">
        <div className="w-full max-w-5xl mx-auto px-4 py-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Logo Unit */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-indigo-900 font-extrabold text-xl">L</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-300 text-xs font-extrabold uppercase tracking-[0.2em] font-mono flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" /> FRENCH LEARNER STUDIO
                  </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Linguist <span className="font-light opacity-60">Français</span></h1>
              </div>
            </div>

            {/* Micro Dashboard Counters */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 shrink-0" id="stats-dashboard-grid">
              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg">
                  <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
                </div>
                <div>
                  <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wider opacity-60">Streak</span>
                  <p className="text-sm font-extrabold text-white">{stats.streak || 0}</p>
                </div>
              </div>

              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg">
                  <BookOpen className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wider opacity-60">Dictionary</span>
                  <p className="text-sm font-extrabold text-white">{stats.masteredWords || dictionary.length}</p>
                </div>
              </div>

              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2.5">
                <div className="p-1.5 bg-pink-500/20 text-pink-300 rounded-lg">
                  <Trophy className="w-4 h-4 text-pink-300" />
                </div>
                <div>
                  <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wider opacity-60">Best Run</span>
                  <p className="text-sm font-extrabold text-white">{stats.highStreak || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Elegant Section Toggles */}
          <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-slate-300 max-w-sm mt-8 backdrop-blur-xs">
            <button
              onClick={() => setCurrentView('quiz')}
              type="button"
              id="view-toggle-quiz"
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                currentView === 'quiz'
                  ? 'bg-white/15 text-white border border-white/20 shadow-md'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-4 h-4 text-purple-200" /> LEARN (MCQ)
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('dictionary')}
              id="view-toggle-dictionary"
              className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                currentView === 'dictionary'
                  ? 'bg-white/15 text-white border border-white/20 shadow-md'
                  : 'hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-4 h-4 text-pink-200" /> MY DICTIONARY
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8" id="application-body">
        <AnimatePresence mode="wait">
          {currentView === 'quiz' ? (
            <motion.div
              key="quiz-deck"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* Informational tip panel */}
              <div className="glass-card rounded-2xl p-4 mb-6 max-w-2xl mx-auto flex items-start gap-3">
                <div className="mt-0.5 p-1 bg-white/10 rounded-lg text-pink-300">
                  <Smile className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-pink-200 uppercase tracking-wider mb-0.5">Learner Guide</h4>
                  <p className="text-xs text-indigo-100 leading-normal opacity-85">
                    Practice vocabulary with interactive Multiple-Choice Questions. Listen to pronunciations, analyze real contextual sentences, and add challenging words to your permanent library with a single tap.
                  </p>
                </div>
              </div>

              <QuizCard
                onSaveToDictionary={handleSaveToDictionary}
                savedWordsSet={savedWordsSet}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dictionary-deck"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <DictionaryView
                entries={dictionary}
                onDeleteEntry={handleDeleteEntry}
                onUpdateNotes={handleUpdateNotes}
                onManualAdd={handleSaveToDictionary}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Humble Elegant Footer */}
      <footer className="py-6 border-t border-white/10 mt-12 bg-black/20" id="main-footer">
        <div className="w-full max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-indigo-200/50">
            © {new Date().getFullYear()} Linguist Français. Daily French Vocabulary Drill • Created for Visual Learning.
          </p>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[11px] font-mono text-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud Storage Emulated Locally
          </div>
        </div>
      </footer>
    </div>
  );
}
