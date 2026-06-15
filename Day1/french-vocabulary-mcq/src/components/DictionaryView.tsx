import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Bookmark, Trash2, Edit3, Check, X, Sparkles, BookOpen, Volume2, Plus, ArrowRight, Star, Tag, Layers, RefreshCcw } from 'lucide-react';
import { DictionaryEntry } from '../types.js';

interface DictionaryViewProps {
  entries: DictionaryEntry[];
  onDeleteEntry: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onManualAdd: (entry: Omit<DictionaryEntry, 'id' | 'savedAt'>) => void;
}

export default function DictionaryView({ entries, onDeleteEntry, onUpdateNotes, onManualAdd }: DictionaryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  
  // Custom lookup form state
  const [newWordQuery, setNewWordQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);

  // Note editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');

  // Extract unique categories and levels from saved entries
  const uniqueCategories = ['All', ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean)))];
  const uniqueLevels = ['All', ...Array.from(new Set(entries.map((e) => e.level).filter(Boolean)))];

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordQuery.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await fetch('/api/dictionary/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: newWordQuery.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch translation from dictionary gateway.');
      }

      const data = await res.json();
      setLookupResult(data);
    } catch (err) {
      console.error(err);
      setLookupError('Translating failed. Please check network connection or verify spelling.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddLookupResult = () => {
    if (!lookupResult) return;
    onManualAdd({
      frenchWord: lookupResult.frenchWord,
      englishMeaning: lookupResult.englishMeaning,
      sentenceFrench: lookupResult.sentenceFrench,
      sentenceEnglish: lookupResult.sentenceEnglish,
      pronunciationGuide: lookupResult.pronunciationGuide,
      category: lookupResult.category || 'General',
      level: lookupResult.level || 'beginner',
      notes: lookupResult.notes || ''
    });
    setLookupResult(null);
    setNewWordQuery('');
  };

  const handleStartEditing = (entry: DictionaryEntry) => {
    setEditingId(entry.id);
    setEditingNotesText(entry.notes || '');
  };

  const handleSaveNotes = (id: string) => {
    onUpdateNotes(id, editingNotesText);
    setEditingId(null);
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

  // Filter saved entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.frenchWord.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.englishMeaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'All' || entry.category === filterCategory;
    const matchesLevel = filterLevel === 'All' || entry.level === filterLevel;

    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <div className="space-y-8" id="dictionary-panel">
      {/* Visual Header Grid for dynamic manual input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dictionary-top-section">
        {/* Manual Lookup Translation Card */}
        <div className="glass p-6 rounded-3xl" id="dictionary-lookup-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-pink-300 shrink-0" />
            <h3 className="font-bold text-white text-base">Gemini French Scholar</h3>
          </div>
          <p className="text-xs text-indigo-200 opacity-80 mb-4">Translate any word or phrase on the fly, examine context examples, and add immediately to your deck.</p>

          <form onSubmit={handleLookup} className="space-y-3.5">
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type French (e.g. voiture)"
                  value={newWordQuery}
                  onChange={(e) => setNewWordQuery(e.target.value)}
                  id="lookup-query-input"
                  className="w-full pl-3 pr-10 py-2.5 glass-input rounded-xl text-sm placeholder-white/30"
                />
                <button
                  type="submit"
                  disabled={lookupLoading || !newWordQuery.trim()}
                  className="absolute right-1.5 top-1.5 p-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                  title="Search translation"
                >
                  {lookupLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {lookupError && (
              <p className="text-xs text-rose-200 font-medium bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">{lookupError}</p>
            )}
          </form>

          {/* Real-time Translator Response Box */}
          <AnimatePresence>
            {lookupResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 border border-white/10 bg-white/5 rounded-xl p-4 space-y-3.5"
                id="lookup-result-box"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-bold text-white">{lookupResult.frenchWord}</span>
                    <button
                      onClick={() => handleSpeak(lookupResult.frenchWord)}
                      type="button"
                      className="p-1 px-1.5 hover:bg-white/15 rounded-md text-pink-300 bg-white/5 border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                    >
                      <Volume2 className="w-3 h-3" /> SPEAK
                    </button>
                  </div>
                  <p className="text-[11px] text-pink-200 font-mono font-semibold">Phonetic: {lookupResult.pronunciationGuide}</p>
                </div>

                <div className="border-t border-white/5 pt-2.5">
                  <span className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase block">Meaning</span>
                  <p className="text-sm text-indigo-100 font-bold">{lookupResult.englishMeaning}</p>
                </div>

                {lookupResult.sentenceFrench && (
                  <div className="border-t border-white/5 pt-2.5">
                    <span className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase block">Context Example</span>
                    <p className="text-xs italic text-indigo-50">"{lookupResult.sentenceFrench}"</p>
                    <p className="text-[11px] text-indigo-200/75 mt-0.5">"{lookupResult.sentenceEnglish}"</p>
                  </div>
                )}

                {lookupResult.notes && (
                  <div className="border-t border-white/5 pt-2.5">
                    <span className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase block">Grammar Note</span>
                    <p className="text-xs text-indigo-200/80 leading-normal">{lookupResult.notes}</p>
                  </div>
                )}

                <button
                  type="button"
                  id="add-lookup-btn"
                  onClick={handleAddLookupResult}
                  className="w-full mt-2 py-2.5 px-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:opacity-90 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-pink-200" /> Save to My Dictionary
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search, Filter, and Dictionary list segment */}
        <div className="lg:col-span-2 space-y-4" id="saved-dictionary-list">
          <div className="glass p-6 rounded-3xl">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-pink-300 shrink-0" />
                Dictionnaire Personnel ({entries.length})
              </h3>
              
              {/* Reset/clear dictionary layout hints */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search saved vocabulary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="dictionary-filter-search"
                  className="w-full pl-9 pr-4 py-2 glass-input rounded-xl text-xs placeholder-white/30"
                />
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Quick Filter Pill Controls */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10" id="filter-pills-bar">
              <div className="flex items-center gap-1.5 mr-2 text-[10px] font-bold tracking-wider text-indigo-300 uppercase">
                <Tag className="w-3 h-3" /> Focus:
              </div>
              {uniqueCategories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-white/25 text-white font-bold border border-white/20'
                      : 'bg-white/5 border border-white/5 hover:bg-white/10 text-indigo-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {uniqueCategories.length > 5 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-white/10 bg-white/5 rounded-full text-indigo-200 cursor-pointer focus:outline-none"
                >
                  <option value="All" className="bg-indigo-950 text-indigo-200">More Categories...</option>
                  {uniqueCategories.map(c => <option key={c} value={c} className="bg-indigo-950 text-indigo-200">{c}</option>)}
                </select>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-dashed border-white/10" id="filter-level-pills">
              <div className="flex items-center gap-1.5 mr-2 text-[10px] font-bold tracking-wider text-indigo-300 uppercase">
                <Layers className="w-3 h-3" /> Tier:
              </div>
              {['All', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-3 py-1 rounded-full text-xs capitalize transition-colors cursor-pointer ${
                    filterLevel === lvl
                      ? 'bg-pink-500/30 text-white font-bold border border-pink-400/30'
                      : 'bg-white/5 border border-white/5 hover:bg-white/10 text-indigo-250'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Deck List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            <AnimatePresence>
              {filteredEntries.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/5 rounded-3xl border border-dashed border-white/10 p-12 text-center"
                  id="empty-dictionary-visual"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-300">
                    <Bookmark className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">No vocabulary saved here yet</h4>
                  <p className="text-xs text-indigo-200 opacity-80 max-w-sm mx-auto">
                    Try starting a vocabulary quiz and saving words you struggle with, or type a sentence in the Scholar box above!
                  </p>
                </motion.div>
              ) : (
                filteredEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card glass-card-hover p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-start md:justify-between gap-4"
                  >
                    {/* Entry Core Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-white">{entry.frenchWord}</span>
                        <button
                          onClick={() => handleSpeak(entry.frenchWord)}
                          className="p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          title="Speak word"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        
                        <span className="text-[10px] font-bold font-mono tracking-wider bg-white/10 text-indigo-100 rounded-md px-2 py-0.5 uppercase">
                          {entry.level}
                        </span>
                        
                        {entry.category && (
                          <span className="text-[10px] font-semibold bg-pink-500/20 text-pink-200 rounded-md px-2 py-0.5">
                            {entry.category}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono font-medium text-pink-300">
                        Phonetic: <span className="underline">{entry.pronunciationGuide || '[phonétique]'}</span>
                      </div>

                      <div className="text-sm font-bold text-white">
                        {entry.englishMeaning}
                      </div>

                      {entry.sentenceFrench && (
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-indigo-100">
                          <p className="text-white italic">"{entry.sentenceFrench}"</p>
                          <p className="text-indigo-200/80 mt-0.5">"{entry.sentenceEnglish}"</p>
                        </div>
                      )}

                      {/* Custom note container */}
                      <div className="pt-2 border-t border-dashed border-white/10 text-xs">
                        {editingId === entry.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingNotesText}
                              onChange={(e) => setEditingNotesText(e.target.value)}
                              rows={2}
                              className="w-full p-2 text-xs glass-input rounded-lg text-white"
                              placeholder="Write memory clues or exceptions notes..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveNotes(entry.id)}
                                className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Save Note
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1 bg-white/10 hover:bg-white/15 text-indigo-100 rounded-md text-[11px] font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4 bg-white/5 p-2.5 rounded-lg border border-white/10">
                            <div className="text-indigo-200 leading-relaxed font-normal">
                              <span className="font-semibold text-indigo-300 block pb-0.5 text-[10px] tracking-widest uppercase">My Memory Hints</span>
                              {entry.notes ? entry.notes : <span className="italic opacity-60">No custom notes yet. Create a note...</span>}
                            </div>
                            <button
                              onClick={() => handleStartEditing(entry)}
                              className="p-1 hover:bg-white/10 text-indigo-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Edit Notes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete entry action bar */}
                    <div className="flex md:flex-col justify-end gap-2 md:pl-2">
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-2 text-indigo-300 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl border border-transparent transition-all cursor-pointer"
                        title="Delete vocabulary word"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
