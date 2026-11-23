'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  ArrowLeft,
  Star,
  Users,
  Clock,
  Library,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  BookmarkPlus,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface BookDetail {
  id: string;
  library_id: string;
  library_name: string;
  library_location: string;
  code: string;
  title: string;
  author: string;
  category: string;
  status: 'AVAILABLE' | 'BORROWED' | 'RESERVED';
  created_at: string;
  current_borrower: string | null;
  deadline_at: string | null;
  is_overdue: boolean;
  user_holds_book: boolean;
  user_queue_position: number | null;
  rating_avg: string | null;
  feedback_count: number;
}

interface QueueItem {
  id: string;
  position: number;
  student_name: string;
  class_name: string | null;
  created_at: string;
  is_current_user: boolean;
}

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  student_name: string;
  class_name: string | null;
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Action status message
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Interactive feedback form
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const fetchBookDetails = () => {
    setLoading(true);
    fetch(`/api/books/${bookId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Kitob topilmadi');
        return res.json();
      })
      .then((data) => {
        setBook(data.book);
        setQueue(data.queue || []);
        setFeedbacks(data.feedbacks || []);
      })
      .catch((err) => {
        setActionMessage({ text: err.message, type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    fetchBookDetails();
  }, [bookId]);

  // Handle Reserve (Bron qilish)
  const handleReserve = async () => {
    if (!currentUser) {
      router.push(`/login?redirect=/books/${bookId}`);
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}/reserve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        fetchBookDetails();
      } else {
        setActionMessage({ text: data.error || 'Xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Join Queue (Navbatga yozilish)
  const handleJoinQueue = async () => {
    if (!currentUser) {
      router.push(`/login?redirect=/books/${bookId}`);
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}/queue`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        fetchBookDetails();
      } else {
        setActionMessage({ text: data.error || 'Xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Feedback Submission
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push(`/login?redirect=/books/${bookId}`);
      return;
    }
    if (!comment.trim()) return;

    setFeedbackLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/books/${bookId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActionMessage({ text: 'Fikringiz muvaffaqiyatli saqlandi va kitobxonlik yulduzlaringizga qo\'shildi!', type: 'success' });
        setComment('');
        fetchBookDetails();
      } else {
        setActionMessage({ text: data.error || 'Fikrni saqlab bo\'lmadi', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kitob ma&apos;lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Kitob topilmadi</h2>
        <p className="text-slate-500 dark:text-slate-400">Ushbu identifikatorga ega kitob tizimda mavjud emas yoki o&apos;chirilgan.</p>
        <Link
          href="/books"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Katalogga qaytish</span>
        </Link>
      </div>
    );
  }

  const isAvailable = book.status === 'AVAILABLE';
  const isBorrowed = book.status === 'BORROWED';
  const isReserved = book.status === 'RESERVED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        href="/books"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kitoblar katalogiga qaytish</span>
      </Link>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between shadow-sm transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Yopish
          </button>
        </div>
      )}

      {/* Book Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-sm relative overflow-hidden transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Pen Code & Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 tracking-wider">
                {book.code}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {book.category}
              </span>

              {isAvailable && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Bo&apos;sh (Mavjud)
                </span>
              )}

              {isBorrowed && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    book.is_overdue
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                      : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      book.is_overdue ? 'bg-rose-600' : 'bg-amber-600'
                    }`}
                  />
                  {book.is_overdue ? "Muddati o'tgan (Band)" : "Band (O'qilmoqda)"}
                </span>
              )}

              {isReserved && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  Bron qilingan
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {book.title}
            </h1>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Muallif: {book.author}</p>

            {/* Stars rating badge */}
            <div className="flex items-center gap-3 pt-1">
              {book.rating_avg ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(Number(book.rating_avg))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    {book.rating_avg} ({book.feedback_count} ta fikr)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">Hozircha baholanmagan</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 pt-1">
              <Library className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>{book.library_name}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{book.library_location}</span>
            </div>
          </div>

          {/* Action Callouts */}
          <div className="flex flex-col items-stretch sm:items-end gap-3 min-w-[220px]">
            {currentUser?.role === 'STUDENT' && isAvailable && (
              <button
                onClick={handleReserve}
                disabled={actionLoading}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BookmarkPlus className="w-5 h-5" />
                <span>{actionLoading ? 'Band qilinmoqda...' : 'Bron qilish (24 soat)'}</span>
              </button>
            )}

            {currentUser?.role === 'STUDENT' && isBorrowed && !book.user_holds_book && (
              <button
                onClick={handleJoinQueue}
                disabled={actionLoading || book.user_queue_position !== null}
                className="w-full sm:w-auto px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-md hover:shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Users className="w-5 h-5" />
                <span>
                  {book.user_queue_position !== null
                    ? `Navbatdasiz (#${book.user_queue_position})`
                    : actionLoading
                    ? 'Yozilmoqda...'
                    : 'Navbatga yozilish'}
                </span>
              </button>
            )}

            {book.user_holds_book && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>Ushbu kitob ayni damda sizda</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Borrow Status Box */}
        {isBorrowed && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Hozirgi bandlik ma&apos;lumotlari:</span>
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-200">
                Kitobxon: <span className="font-semibold">{book.current_borrower || 'Kitobxon'}</span>
              </div>
            </div>

            {book.deadline_at && (
              <div className="text-right">
                <div className="text-xs text-slate-500 dark:text-slate-400">Qaytarish muddati:</div>
                <div
                  className={`text-sm sm:text-base font-bold ${
                    book.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {new Date(book.deadline_at).toLocaleDateString('uz-UZ')}
                  {book.is_overdue && ' (Muddati o\'tgan!)'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: Ordered Queue & Feedbacks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Queue Table (1 col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Kutish Navbati
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300">
                {queue.length} kishi
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Kitob topshirilganda navbatdagi 1-o&apos;rindagi o&apos;quvchiga avtomatik Telegram orqali xabar boradi.
            </p>

            {queue.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Hozircha navbatda hech kim yo&apos;q
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      q.is_current_user
                        ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800/80 font-semibold text-purple-900 dark:text-purple-200'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[11px]">
                        #{q.position}
                      </span>
                      <div>
                        <div>{q.student_name}</div>
                        {q.class_name && <div className="text-[10px] text-slate-400 dark:text-slate-500">{q.class_name}</div>}
                      </div>
                    </div>
                    {q.is_current_user && (
                      <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 rounded font-bold text-[10px]">
                        Siz
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Feedbacks & Reviews (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Feedback Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Fikr va tavsiya qoldirish
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ushbu kitobni o&apos;qigan bo&apos;lsangiz, o&apos;z bahongiz va taassurotlaringizni boshqa o&apos;quvchilar bilan ulashing. Taqriz uchun yulduz ballari beriladi!
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4 pt-1">
              {/* Interactive Star selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Bahongiz (1 dan 5 gacha yulduz):
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(null)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (hoverRating ?? rating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-125 transition-transform focus:outline-none"
                          title={`${star} yulduz`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              isFilled
                                ? 'fill-amber-400 text-amber-400 filter drop-shadow'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="ml-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {hoverRating ?? rating} / 5 yulduz
                  </span>
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Fikringiz yoki qisqacha taqriz:
                </label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Kitobning qaysi joyi sizga ko'proq yoqdi? Boshqalarga nimani tavsiya qilasiz?..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackLoading || !comment.trim()}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{feedbackLoading ? 'Yuborilmoqda...' : 'Fikrni yuborish'}</span>
              </button>
            </form>
          </div>

          {/* Feedback List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Kitobxonlar fikrlari ({feedbacks.length})
              </h3>
            </div>

            {feedbacks.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                Ushbu kitobga hali hech kim fikr bildirmagan. Birinchi bo&apos;lib fikr qoldiring!
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{f.student_name}</span>
                        {f.class_name && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">({f.class_name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < f.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{f.comment}</p>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 text-right">
                      {new Date(f.created_at).toLocaleDateString('uz-UZ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
