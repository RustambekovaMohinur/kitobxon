'use client';

import { useState } from 'react';
import {
  Sparkles,
  X,
  BookOpen,
  Star,
  CheckCircle,
  ArrowRight,
  Compass,
  Smile,
  Zap,
} from 'lucide-react';

interface RecommendedBook {
  id: string;
  code: string;
  title: string;
  author: string;
  category: string;
  pitch: string;
  rating_avg: string | null;
  feedback_count: number;
}

interface AiBookRecommenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryId?: string;
  onSelectBook?: (bookCode: string) => void;
}

const QUICK_TOPICS = [
  { label: 'Sarguzasht & Fantastika 🚀', value: 'Sarguzasht va fantastika, qiziqarli voqealarga boy' },
  { label: 'Shaxsiy rivojlanish & Motivatsiya 💡', value: 'Shaxsiy rivojlanish, intellekt va maqsadga erishish' },
  { label: 'Tarixiy roman & Milliy asarlar 🏛', value: 'Tarixiy voqealar, milliy adabiyot va o\'zbek durdonalari' },
  { label: 'Detektiv & Sirli voqealar 🔍', value: 'Qiziqarli detektiv, tergov va jumboqli syujetlar' },
  { label: 'Qalban dam olish & Yengil mutolaa 🌿', value: 'Yengil, ilhomlantiruvchi va samimiy hikoyalar' },
];

export default function AiBookRecommenderModal({
  isOpen,
  onClose,
  libraryId,
  onSelectBook,
}: AiBookRecommenderModalProps) {
  const [query, setQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGetRecommendations = async (customQuery?: string) => {
    const activeQuery = customQuery !== undefined ? customQuery : (query || selectedTopic);
    setLoading(true);
    setErrorMsg('');
    setSearched(true);

    try {
      const res = await fetch('/api/books/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          library_id: libraryId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRecommendations(data.recommendations || []);
        if (data.recommendations?.length === 0 && data.message) {
          setErrorMsg(data.message);
        }
      } else {
        setErrorMsg(data.error || 'Tavsiyalarni olishda xatolik yuz berdi');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server bilan bog\'lanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopic = (val: string) => {
    setSelectedTopic(val);
    setQuery(val);
    handleGetRecommendations(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini AI Aqlli Maslahatchisi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Sizga mos kitob tavsiyasi
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Kutubxonamizdagi ayni damda <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">mavjud bo&apos;sh kitoblar</strong> orasidan qiziqishingizga eng mosini tanlab beramiz.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Topics */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>Tezkor mavzu yoki kayfiyatni tanlang:</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TOPICS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => handleSelectTopic(t.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedTopic === t.value
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Yoki o&apos;z so&apos;rovingizni yozing:</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGetRecommendations()}
              placeholder="Masalan: Qahramonlik va do'stlik haqida qiziqarli asar..."
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleGetRecommendations()}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Tanlanmoqda...' : 'Tavsiya olish'}</span>
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="space-y-3 pt-2">
          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Gemini AI kutubxona bazasidagi mavjud kitoblarni tahlil qilmoqda...
              </p>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
              {errorMsg}
            </div>
          )}

          {!loading && searched && recommendations.length === 0 && !errorMsg && (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              Ushbu so&apos;rov bo&apos;yicha kitob topilmadi. Boshqa mavzu yoki janrni sinab ko&apos;ring.
            </div>
          )}

          {!loading && recommendations.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                Tavsiya etilgan kitoblar ({recommendations.length} ta):
              </div>
              {recommendations.map((book) => (
                <div
                  key={book.id || book.code}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                          {book.code}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          {book.category}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Mavjud
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Muallif: <span className="text-slate-800 dark:text-slate-200 font-semibold">{book.author}</span>
                      </p>
                    </div>

                    {book.rating_avg && (
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800/40">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{book.rating_avg}</span>
                      </div>
                    )}
                  </div>

                  {/* AI Pitch */}
                  <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 italic flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>&ldquo;{book.pitch}&rdquo;</span>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        if (onSelectBook) onSelectBook(book.code);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                    >
                      <span>Katalogda ko&apos;rish va olish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
