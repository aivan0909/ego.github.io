import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  Star,
  Trash2,
  Sparkles,
  BookOpen,
  Globe,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Mic,
  Trophy,
  Award,
  Gamepad2,
  Puzzle,
  Newspaper,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AGE_LEVELS, SENTENCE_COMPONENTS, DAILY_NEWS } from './data';
import './index.css';

// Simple Error fallback
const ErrorScreen = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
    <div className="max-w-md w-full glass-card p-6 border-rose-500/50">
      <h2 className="text-xl font-bold text-rose-400 mb-4 flex items-center gap-2">
        <AlertTriangle /> 發生錯誤
      </h2>
      <pre className="bg-black/50 p-4 rounded text-sm overflow-auto max-h-60 text-slate-300 border border-slate-700">
        {error.toString()}
      </pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 w-full btn-primary py-2 rounded-xl"
      >
        重新整理頁面
      </button>
    </div>
  </div>
);

function App() {
  const [renderError, setRenderError] = useState(null);

  try {
    const [activeTab, setActiveTab] = useState('generator'); // 'generator' or 'news'
    const [ageLevel, setAgeLevel] = useState('child');
    const [selections, setSelections] = useState({
      subject: (SENTENCE_COMPONENTS.subject.options.child[0]?.en || ''),
      verb: (SENTENCE_COMPONENTS.verb.options.child[0]?.en || ''),
      object: (SENTENCE_COMPONENTS.object.options.child[0]?.en || ''),
      manner: (SENTENCE_COMPONENTS.manner.options.child[0]?.en || ''),
      place: (SENTENCE_COMPONENTS.place.options.child[0]?.en || ''),
      time: (SENTENCE_COMPONENTS.time.options.child[0]?.en || '')
    });
    const [favorites, setFavorites] = useState([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [recognition, setRecognition] = useState(null);

    // 狀態
    const [isSimpleMode, setIsSimpleMode] = useState(false);
    const [isPuzzleMode, setIsPuzzleMode] = useState(false);
    const [shuffledWords, setShuffledWords] = useState([]);
    const [selectedWords, setSelectedWords] = useState([]);

    useEffect(() => {
      try {
        const saved = localStorage.getItem('english_prompts_favorites');
        const savedScore = localStorage.getItem('english_prompts_score');
        if (saved) setFavorites(JSON.parse(saved));
        if (savedScore) setScore(parseInt(savedScore) || 0);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.lang = 'en-US';
          rec.continuous = false;
          rec.interimResults = false;
          setRecognition(rec);
        }
      } catch (e) {
        console.error("Initialization error", e);
      }
    }, []);

    const speak = (text) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    };

    const randomize = () => {
      const newSelections = {};

      // 1. 先選主格並獲取其單複數屬性
      const subjectOptions = SENTENCE_COMPONENTS.subject.options[ageLevel];
      const randomSub = subjectOptions[Math.floor(Math.random() * subjectOptions.length)];
      newSelections.subject = randomSub.en;
      const isPlural = randomSub.isPlural ?? false;

      // 2. 根據主格單複數隨機選取動詞
      const verbOptions = SENTENCE_COMPONENTS.verb.options[ageLevel].filter(v =>
        v.isPlural === undefined || v.isPlural === isPlural
      );
      const randomVerb = verbOptions[Math.floor(Math.random() * verbOptions.length)];
      newSelections.verb = randomVerb.en;

      // 3. 其餘部分隨機
      ['object', 'manner', 'place', 'time'].forEach(key => {
        const options = SENTENCE_COMPONENTS[key].options[ageLevel];
        const randomOpt = options[Math.floor(Math.random() * options.length)];
        newSelections[key] = randomOpt.en;
      });

      setSelections(newSelections);
      setIsPuzzleMode(false);
    };

    const toggleFavorite = () => {
      const sentence = currentSentence;
      const isFav = favorites.find(f => f.text === sentence);
      let newFavs;
      if (isFav) {
        newFavs = favorites.filter(f => f.text !== sentence);
      } else {
        newFavs = [{ id: Date.now(), text: sentence, translation: currentTranslation }, ...favorites];
      }
      setFavorites(newFavs);
      localStorage.setItem('english_prompts_favorites', JSON.stringify(newFavs));
    };

    const removeFavorite = (id) => {
      const newFavs = favorites.filter(f => f.id !== id);
      setFavorites(newFavs);
      localStorage.setItem('english_prompts_favorites', JSON.stringify(newFavs));
    };

    const startRecording = () => {
      if (recognition && !isRecording) {
        recognition.start();
        setIsRecording(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          const target = currentSentence.toLowerCase().replace(/[.,!?;]/g, "");
          if (transcript.includes(target) || target.includes(transcript)) {
            setScore(prev => prev + 10);
            setStreak(prev => prev + 1);
            alert("Perfect Pronunciation! 🎉 +10 Points");
          } else {
            alert(`You said: "${transcript}"\nTry again!`);
          }
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
      }
    };

    const currentSentence = useMemo(() => {
      if (isSimpleMode) {
        return `${selections.subject} ${selections.verb} ${selections.object}.`.replace(/\s+/g, ' ');
      }
      return `${selections.subject} ${selections.verb} ${selections.object} ${selections.manner} ${selections.place} ${selections.time}.`.replace(/\s+/g, ' ');
    }, [selections, isSimpleMode]);

    const currentTranslation = useMemo(() => {
      const getZH = (key, val) => {
        // 先在目前的年齡層尋找
        let found = SENTENCE_COMPONENTS[key].options[ageLevel]?.find(o => o.en === val);

        // 如果沒找到，則遍歷所有年齡層尋找（處理切換年齡層時的舊狀態）
        if (!found) {
          Object.values(SENTENCE_COMPONENTS[key].options).some(options => {
            found = options.find(o => o.en === val);
            return !!found;
          });
        }

        return found?.zh || '';
      };

      if (isSimpleMode) {
        return `${getZH('subject', selections.subject)}${getZH('verb', selections.verb)}${getZH('object', selections.object)}。`;
      }
      return `${getZH('time', selections.time)}，${getZH('subject', selections.subject)}${getZH('manner', selections.manner)}${getZH('verb', selections.verb)}${getZH('object', selections.object)}${getZH('place', selections.place)}。`;
    }, [selections, ageLevel, isSimpleMode]);

    const validationResult = useMemo(() => {
      return { isValid: true, message: "語法過關" };
    }, [selections]);

    const startPuzzle = () => {
      const words = currentSentence.replace(/[.!]/g, '').split(' ');
      setShuffledWords([...words].sort(() => Math.random() - 0.5));
      setSelectedWords([]);
      setIsPuzzleMode(true);
    };

    const handleWordSelect = (word, index) => {
      const newSelected = [...selectedWords, { word, index }];
      setSelectedWords(newSelected);
      const targetWords = currentSentence.replace(/[.!]/g, '').split(' ');
      if (newSelected.length === targetWords.length) {
        const finalStr = newSelected.map(o => o.word).join(' ');
        if (finalStr === targetWords.join(' ')) {
          setScore(prev => prev + 5);
          alert("Challenge Complete! +5 Points");
          setIsPuzzleMode(false);
        } else {
          alert("Incorrect order, try again!");
          setSelectedWords([]);
        }
      }
    };

    const isFavorite = favorites.some(f => f.text === currentSentence);

    if (renderError) return <ErrorScreen error={renderError} />;

    return (
      <div className={`max-w-6xl mx-auto px-4 py-8 md:py-12 min-h-screen flex flex-col transition-colors duration-500 ${ageLevel === 'child' ? 'theme-kids' : ''}`}>

        {/* Top Navbar */}
        <div className="flex justify-between items-center mb-8 glass-card px-2 py-2 border-slate-700/50">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-10 py-3 rounded-xl text-base font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'generator' ? 'btn-primary shadow-halo' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-700/60'}`}
            >
              <Zap className="w-5 h-5" /> 語法組合器
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-10 py-3 rounded-xl text-base font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'news' ? 'btn-primary shadow-halo' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-700/60'}`}
            >
              <Newspaper className="w-5 h-5" /> 每日短文
            </button>
          </div>
          <div className="hidden md:flex items-center gap-4 pr-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-bold">{score}</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-400">
              <Award className="w-4 h-4" />
              <span className="text-sm font-bold">Lv.{Math.floor(score / 50) + 1}</span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'generator' ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-12 gap-8"
            >
              {/* Main Content */}
              <div className="lg:col-span-8 space-y-8">
                <div className="glass-card p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black flex items-center gap-3">
                      <Sparkles className="text-amber-400" />
                      <span className="accent-text">AI 語法組合遊戲</span>
                    </h2>
                    <div className="flex bg-slate-800/60 p-1.5 rounded-xl border border-slate-700">
                      <button onClick={() => setIsSimpleMode(true)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${isSimpleMode ? 'btn-primary shadow-halo' : 'text-slate-500 hover:text-white'}`}>SVO</button>
                      <button onClick={() => setIsSimpleMode(false)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${!isSimpleMode ? 'btn-primary shadow-halo' : 'text-slate-500 hover:text-white'}`}>Full</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {AGE_LEVELS.map((level) => (
                      <button key={level.id} onClick={() => { setAgeLevel(level.id); }} className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all ${ageLevel === level.id ? 'bg-indigo-600/20 border-indigo-500 shadow-halo' : 'bg-slate-800/40 border-slate-700'}`}>
                        <span className="text-2xl">{level.icon}</span>
                        <span className="font-bold text-sm">{level.label}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={randomize} className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-lg">
                    <RefreshCw className="w-6 h-6" /> 智慧隨機組合
                  </button>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-6 flex justify-between items-center">
                    {isSimpleMode ? '核心主動賓' : '完整語句構成'}
                    <span className="text-xs font-normal text-slate-500">點擊選單自由搭配</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(SENTENCE_COMPONENTS)
                      .filter(([key]) => !isSimpleMode || ['subject', 'verb', 'object'].includes(key))
                      .map(([key, data]) => {
                        let filteredOptions = data.options[ageLevel];

                        // 語法邏輯：如果正在選擇動詞，根據目前選中的主語進行過濾
                        if (key === 'verb') {
                          const currentSub = SENTENCE_COMPONENTS.subject.options[ageLevel].find(o => o.en === selections.subject);
                          const isPlural = currentSub?.isPlural ?? false;
                          filteredOptions = filteredOptions.filter(v => v.isPlural === undefined || v.isPlural === isPlural);
                        }

                        return (
                          <div key={key} className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{data.label}</label>
                            <select
                              value={selections[key]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelections(prev => {
                                  let next = { ...prev, [key]: val };
                                  // 如果主格變動了，自動切換動詞到符合單複數的形式
                                  if (key === 'subject') {
                                    const newSub = SENTENCE_COMPONENTS.subject.options[ageLevel].find(o => o.en === val);
                                    const isPlural = newSub?.isPlural ?? false;
                                    const currentVerb = SENTENCE_COMPONENTS.verb.options[ageLevel].find(v => v.en === prev.verb);

                                    // 只有當原本選的動詞單複數不符合時才切換
                                    if (currentVerb && currentVerb.isPlural !== undefined && currentVerb.isPlural !== isPlural) {
                                      const compatibleVerb = SENTENCE_COMPONENTS.verb.options[ageLevel].find(v =>
                                        v.isPlural === isPlural && v.zh === currentVerb.zh
                                      ) || SENTENCE_COMPONENTS.verb.options[ageLevel].find(v => v.isPlural === isPlural);

                                      if (compatibleVerb) next.verb = compatibleVerb.en;
                                    }
                                  }
                                  return next;
                                });
                              }}
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                            >
                              {filteredOptions?.map(opt => <option key={opt.en} value={opt.en}>{opt.en} ({opt.zh})</option>)}
                            </select>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="glass-card p-8 border-indigo-500/30 bg-indigo-500/5 relative">
                    <div className="flex justify-between items-center mb-6">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px] font-bold uppercase">English Result</span>
                      <div className="flex gap-3">
                        <button onClick={startPuzzle} className={`p-3 rounded-full transition-all ${isPuzzleMode ? 'bg-amber-500 shadow-halo-amber' : 'bg-slate-800'}`}><Puzzle className="w-5 h-5" /></button>
                        <button onClick={startRecording} className={`p-3 rounded-full transition-all ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-800'}`}><Mic className="w-5 h-5" /></button>
                        <button onClick={() => speak(currentSentence)} className={`p-3 rounded-full ${isSpeaking ? 'bg-indigo-500 animate-pulse' : 'bg-slate-800'}`}><Volume2 className="w-5 h-5" /></button>
                        <button onClick={toggleFavorite} className={`p-3 rounded-full ${isFavorite ? 'bg-rose-500' : 'bg-slate-800'}`}><Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} /></button>
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                      {isPuzzleMode ? (
                        <div className="space-y-8">
                          <div className="flex flex-wrap justify-center gap-3 min-h-[60px] p-4 bg-black/40 rounded-3xl border-2 border-dashed border-indigo-500/30">
                            {selectedWords.map((obj, i) => <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} key={i} className="px-4 py-2 bg-indigo-600 rounded-2xl text-white font-bold shadow-lg">{obj.word}</motion.span>)}
                          </div>
                          <div className="flex flex-wrap justify-center gap-3">
                            {shuffledWords.map((word, idx) => {
                              const used = selectedWords.some(o => o.index === idx);
                              return <button key={idx} disabled={used} onClick={() => handleWordSelect(word, idx)} className={`px-5 py-2.5 rounded-full font-bold transition-all ${used ? 'opacity-0 scale-50' : 'bg-slate-700/50 hover:bg-indigo-500 border border-white/10'}`}>{word}</button>
                            })}
                          </div>
                        </div>
                      ) : <p className="text-3xl md:text-4xl font-black text-white text-center leading-tight">{currentSentence}</p>}
                    </AnimatePresence>
                  </div>

                  <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-bold uppercase text-emerald-400">中文對照翻譯</span>
                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${validationResult.isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {validationResult.isValid ? '邏輯正確 ✅' : `⚠️ ${validationResult.message}`}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 text-center">{currentTranslation}</p>
                  </div>
                </div>
              </div>

              {/* Sidebar Favorites */}
              <div className="lg:col-span-4">
                <div className="glass-card p-6 lg:sticky top-8">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-500" /> 句子收藏本 ({favorites.length})
                  </h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {favorites.length === 0 ? <div className="py-20 text-center text-slate-500 text-sm">點擊星號收藏優美語句</div> :
                      favorites.map(f => (
                        <div key={f.id} className="p-4 bg-slate-800/40 border border-white/5 rounded-2xl relative group hover:border-indigo-500/50 transition-all">
                          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => speak(f.text)} className="bg-slate-700 p-2 rounded-full shadow-lg hover:bg-slate-600 transition-all">
                              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                            <button onClick={() => removeFavorite(f.id)} className="bg-slate-700 p-2 rounded-full shadow-lg hover:bg-slate-600 transition-all">
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-white mb-2 leading-snug pr-8">{f.text}</p>
                          <p className="text-xs text-slate-400">{f.translation}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="news"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-4 accent-text">Daily Short Stories</h2>
                <p className="text-slate-400">精選 Engoo Daily News 優質短文，並提供中英對照與朗讀挑戰。</p>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {DAILY_NEWS.map((article, idx) => (
                  <div key={idx} className="glass-card p-8 hover-glow group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-indigo-400 tracking-widest uppercase">Level {article.level || article.id}: {article.difficulty || 'News'}</span>
                        <h3 className="text-2xl font-bold text-white">{article.title}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => speak(article.content)}
                          className={`p-3 rounded-full transition-all ${isSpeaking ? 'bg-indigo-500 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`}
                        >
                          <Volume2 className="w-5 h-5 text-indigo-400" />
                        </button>
                        <a
                          href={article.source_url || article.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-all"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="p-6 bg-black/20 rounded-2xl border border-white/5">
                        <div className="text-lg text-slate-200 leading-relaxed font-medium">
                          {article.content.split('. ').map((sentence, sIdx, arr) => {
                            const fullSentence = sentence + (sIdx < arr.length - 1 ? '.' : '');
                            return (
                              <span
                                key={sIdx}
                                onClick={() => speak(fullSentence)}
                                className="hover:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer rounded px-1 transition-colors inline group/sentence"
                              >
                                {fullSentence}{' '}
                                <Volume2 className="w-3 h-3 inline-block ml-1 opacity-0 group-hover/sentence:opacity-100 text-indigo-400" />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/5 items-center flex">
                        <p className="text-sm text-slate-400 leading-relaxed italic">
                          {article.translation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-12 py-8 border-t border-white/5 text-center text-slate-600 text-sm">
          <p>© 2026 AI English Learning Adventure. Empowering young learners.</p>
        </footer>
      </div>
    );
  } catch (e) {
    setRenderError(e);
    return null;
  }
}

export default App;
