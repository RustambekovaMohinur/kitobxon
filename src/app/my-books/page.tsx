'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BookmarkCheck,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle,
  Copy,
  Send,
  ExternalLink,
  Library,
  Calendar,
  Sparkles,
  Star,
  Award,
  MessageSquare,
} from 'lucide-react';

interface ActiveBorrow {
  id: string;
  book_id: string;
  title: string;
  author: string;
  code: string;
  category: string;
  library_name: string;
  borrowed_at: string;
  deadline_at: string;
  days_remaining: number;
  is_overdue: boolean;
}

interface PastBorrow {
  id: string;
  book_id: string;
  title: string;
  author: string;
  code: string;
  library_name: string;
  borrowed_at: string;
  returned_at: string | null;
}

interface QueueItem {
  id: string;
  book_id: string;
  title: string;
  author: string;
  code: string;
  library_name: string;
  position: number;
  status: string;
  created_at: string;
}

interface StudentStars {
  total_stars: number;
  books_read: number;
  reviews_count: number;
  rank_title: string;
  next_rank_stars: number;
  progress_percent: number;
}

interface MyFeedback {
  id: string;
  book_id: string;
  book_title: string;
  book_code: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface TelegramInfo {
  is_linked: boolean;
  chat_id: string | null;
  link_code: string | null;
}

export default function MyBooksPage() {
  const [activeBorrows, setActiveBorrows] = useState<ActiveBorrow[]>([]);
  const [pastBorrows, setPastBorrows] = useState<PastBorrow[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [studentStars, setStudentStars] = useState<StudentStars | null>(null);
  const [myFeedbacks, setMyFeedbacks] = useState<MyFeedback[]>([]);
  const [telegram, setTelegram] = useState<TelegramInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual chat_id linking state
  const [manualChatId, setManualChatId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch('/api/student/my-books')
      .then((res) => {
        if (!res.ok) throw new Error('Yuklashda xatolik');
        return res.json();
      })
      .then((data) => {
        setActiveBorrows(data.activeBorrows || []);
        setPastBorrows(data.pastBorrows || []);
        setQueueItems(data.queueItems || []);
        setStudentStars(data.studentStars || null);
        setMyFeedbacks(data.myFeedbacks || []);
        setTelegram(data.telegram || null);
        if (data.telegram?.chat_id) {
          setManualChatId(data.telegram.chat_id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = () => {
    if (telegram?.link_code) {
      navigator.clipboard.writeText(`/start ${telegram.link_code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualChatId.trim()) return;

    setLinkLoading(true);
    setLinkMessage(null);

    try {
      const res = await fetch('/api/user/link-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: manualChatId.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLinkMessage({ text: 'Telegram muvaffaqiyatli bog\'landi!', type: 'success' });
        loadData();
      } else {
        setLinkMessage({ text: data.error || 'Bog\'lashda xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setLinkMessage({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kitoblaringiz ma&apos;lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <BookmarkCheck className="w-7 h-7 text-brand-600 dark:text-brand-400" />
          Mening Kitoblarim
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Siz o&apos;qiyotgan kitoblar, topshirish muddatlari, kitobxonlik yulduzlaringiz va kutish navbatlaringiz
        </p>
      </div>

      {/* Student Stars & Engagement Card */}
      {studentStars && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur border border-white/20 text-xs font-bold text-amber-100">
                <Award className="w-3.5 h-3.5 text-amber-200" />
                <span>Kitobxon Yulduzlari & Reytingi</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {studentStars.rank_title}
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                Har bir topshirilgan kitob uchun <b>+5 yulduz</b>, har bir samimiy taqriz uchun <b>+3 yulduz</b> to&apos;planadi. Kitob o&apos;qishda davom eting va maktabingiz reytingida peshqadam bo&apos;ling!
              </p>

              {/* Progress Bar to Next Level */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-amber-100">
                  <span>Keyingi darajagacha</span>
                  <span>{studentStars.total_stars} / {studentStars.next_rank_stars} yulduz ({studentStars.progress_percent}%)</span>
                </div>
                <div className="w-full bg-black/25 rounded-full h-2.5 overflow-hidden border border-white/20">
                  <div
                    className="bg-white h-2.5 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${studentStars.progress_percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stat Pills */}
            <div className="grid grid-cols-3 gap-3 bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 sm:min-w-[300px] text-center">
              <div className="space-y-1">
                <div className="text-2xl font-black text-white flex items-center justify-center gap-1">
                  <Star className="w-5 h-5 fill-amber-300 text-amber-300 inline" />
                  {studentStars.total_stars}
                </div>
                <div className="text-[11px] text-amber-100 font-semibold">Jami Yulduz</div>
              </div>

              <div className="space-y-1 border-x border-white/20">
                <div className="text-2xl font-black text-white">
                  {studentStars.books_read}
                </div>
                <div className="text-[11px] text-amber-100 font-semibold">O&apos;qilgan</div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-black text-white">
                  {studentStars.reviews_count}
                </div>
                <div className="text-[11px] text-amber-100 font-semibold">Taqrizlar</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Link Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-800/40 dark:border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Telegram Bot Xabarnomalari</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Kechikishlar va navbat yangiliklaridan darhol xabardor bo&apos;ling
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kitob qaytarish muddati tugashidan oldin yoki navbatingiz kelganda bot orqali bildirishnoma olish uchun Telegram profilingizni bog&apos;lang.
            </p>
          </div>

          <div className="bg-white/10 dark:bg-slate-800/70 backdrop-blur-md p-5 rounded-2xl border border-white/20 dark:border-slate-700/80 sm:min-w-[320px] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Holat:</span>
              {telegram?.is_linked ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" /> Bog&apos;langan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" /> Bog&apos;lanmagan
                </span>
              )}
            </div>

            {/* Deep-link or connected state */}
            {telegram?.is_linked ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Profilingiz ulangan!
                  </div>
                  <div>Chat ID: <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">{telegram.chat_id}</code></div>
                  <div className="text-[11px] text-emerald-300/80 mt-1">Eslatmalar va ogohlantirishlar ushbu bot orqali yetkaziladi.</div>
                </div>

                <a
                  href="https://t.me/kitobxon_rasmiy_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>@kitobxon_rasmiy_bot ni ochish</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>

                {/* Chat ID yangilash */}
                <form onSubmit={handleSaveTelegram} className="pt-2 border-t border-white/10 space-y-1.5">
                  <label className="block text-[11px] text-slate-300">
                    Chat ID ni o&apos;zgartirish:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualChatId}
                      onChange={(e) => setManualChatId(e.target.value)}
                      placeholder="Yangi Chat ID"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/20 text-white placeholder:text-slate-400 text-xs border border-white/20 focus:outline-none focus:bg-white/30"
                    />
                    <button
                      type="submit"
                      disabled={linkLoading}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {linkLoading ? '...' : 'Yangilash'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                {telegram?.link_code && (
                  <div className="space-y-2">
                    <a
                      href={`https://t.me/kitobxon_rasmiy_bot?start=${telegram.link_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-blue-500/25"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>@kitobxon_rasmiy_bot orqali bog&apos;lash</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>

                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-300">Yoki botga ushbu buyruqni yuboring:</div>
                      <div className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-white/10">
                        <code className="text-xs font-mono text-amber-300 flex-1 truncate">
                          /start {telegram.link_code}
                        </code>
                        <button
                          onClick={handleCopyCode}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                          title="Nusxalash"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      {copied && (
                        <div className="text-[11px] text-emerald-300 font-medium">Nusxalandi!</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Chat ID form */}
                <form onSubmit={handleSaveTelegram} className="pt-2 border-t border-white/10 space-y-2">
                  <label className="block text-[11px] text-slate-300">
                    Yoki Telegram Chat ID ni qo&apos;lda kiriting:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualChatId}
                      onChange={(e) => setManualChatId(e.target.value)}
                      placeholder="Masalan: 12345678"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/20 text-white placeholder:text-slate-400 text-xs border border-white/20 focus:outline-none focus:bg-white/30"
                    />
                    <button
                      type="submit"
                      disabled={linkLoading}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {linkLoading ? '...' : 'Saqlash'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {linkMessage && (
              <div
                className={`text-xs p-2 rounded-lg font-medium ${
                  linkMessage.type === 'success'
                    ? 'bg-emerald-900/50 text-emerald-200'
                    : 'bg-rose-900/50 text-rose-200'
                }`}
              >
                {linkMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. Hozirda qo'lingizdagi kitoblar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Hozirda qo&apos;lingizdagi kitoblar ({activeBorrows.length})
          </h2>
        </div>

        {activeBorrows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Sizda hozircha olingan kitoblar yo&apos;q</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Katalogdan yangi kitoblarni topib, kutubxonadan olishingiz mumkin.
            </p>
            <Link
              href="/books"
              className="inline-block mt-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors"
            >
              Katalogni ko&apos;rish
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBorrows.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {b.code}
                  </span>
                  {b.is_overdue ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Muddati {b.days_remaining} kun o&apos;tgan!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                      <Clock className="w-3.5 h-3.5" />
                      {b.days_remaining} kun qoldi
                    </span>
                  )}
                </div>

                <div>
                  <Link
                    href={`/books/${b.book_id}`}
                    className="text-base font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {b.title}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.author}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Olingan sana:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date(b.borrowed_at).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Topshirish muddati:</span>
                    <span
                      className={`font-semibold ${
                        b.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {new Date(b.deadline_at).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span>Kutubxona:</span>
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{b.library_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Navbatdagi kitoblar */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Siz kutayotgan kitob navbatlari ({queueItems.length})
        </h2>

        {queueItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Siz hozirda hech qaysi kitob navbatida emassiz
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queueItems.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {q.code}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{q.library_name}</span>
                  </div>
                  <Link
                    href={`/books/${q.book_id}`}
                    className="font-bold text-slate-900 dark:text-white text-sm hover:text-brand-600 dark:hover:text-brand-400 transition-colors block"
                  >
                    {q.title}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{q.author}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-400 dark:text-slate-500">Navbatingiz:</div>
                  <div className="text-xl font-extrabold text-purple-700 dark:text-purple-400">#{q.position}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800/60">
                    {q.status === 'NOTIFIED' ? 'Tayyor (Olib keting)' : 'Kutilmoqda'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. O'qilgan kitoblar tarixi */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          O&apos;qib qaytarilgan kitoblar tarixi ({pastBorrows.length})
        </h2>

        {pastBorrows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Hozircha qaytarilgan kitoblar tarixi mavjud emas
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">Kitob kodi</th>
                    <th className="px-5 py-3 text-left">Kitob nomi</th>
                    <th className="px-5 py-3 text-left">Muallif</th>
                    <th className="px-5 py-3 text-left">Topshirilgan sana</th>
                    <th className="px-5 py-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pastBorrows.map((pb) => (
                    <tr key={pb.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {pb.code}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{pb.title}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-xs">{pb.author}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {pb.returned_at ? new Date(pb.returned_at).toLocaleDateString('uz-UZ') : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/books/${pb.book_id}`}
                          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300"
                        >
                          Taqriz yozish →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 4. Siz yozgan taqrizlar */}
      {myFeedbacks.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Siz yozgan taqrizlar ({myFeedbacks.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myFeedbacks.map((f) => (
              <div
                key={f.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/books/${f.book_id}`}
                    className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {f.book_title}
                  </Link>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= f.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-3">
                  &ldquo;{f.comment}&rdquo;
                </p>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right pt-1">
                  {new Date(f.created_at).toLocaleDateString('uz-UZ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
