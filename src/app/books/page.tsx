'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Filter,
  Star,
  Clock,
  User,
  Users,
  CheckCircle,
  AlertTriangle,
  BookmarkPlus,
  Library,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import AiBookRecommenderModal from '@/components/AiBookRecommenderModal';

interface BookItem {
  id: string;
  library_id: string;
  library_name: string;
  code: string;
  title: string;
  author: string;
  category: string;
  status: 'AVAILABLE' | 'BORROWED' | 'RESERVED';
  created_at: string;
  current_borrower: string | null;
  deadline_at: string | null;
  is_overdue: boolean;
  queue_count: number;
  rating_avg: string | null;
  feedback_count: number;
}

interface LibraryFilter {
  id: string;
  name: string;
}

export default function BooksCatalogPage() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [libraries, setLibraries] = useState<LibraryFilter[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedLibrary, setSelectedLibrary] = useState('');

  // Action status modal/toast
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [aiRecommenderOpen, setAiRecommenderOpen] = useState(false);

  const categories = [
    'ALL',
    'Badiiy adabiyot',
    'Tarixiy roman',
    'Jahon adabiyoti',
    'Shaxsiy rivojlanish',
    'Klassika',
    'Tarixiy meros',
    'Bolalar adabiyoti',
    'Darslik',
  ];

  // Fetch libraries for filter dropdown
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    fetch('/api/libraries')
      .then((res) => res.json())
      .then((data) => {
        if (data.libraries) setLibraries(data.libraries);
      })
      .catch((e) => console.error(e));
  }, []);

  // Fetch books
  const loadBooks = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
    if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
    if (selectedLibrary) params.set('library_id', selectedLibrary);

    fetch(`/api/books?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setBooks(data.books || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, [selectedCategory, selectedStatus, selectedLibrary]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBooks();
  };

  // Quick Reserve (Bron qilish)
  const handleReserve = async (bookId: string) => {
    setActionLoadingId(bookId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}/reserve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        loadBooks();
      } else {
        setActionMessage({ text: data.error || 'Xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Join Queue (Navbatga yozilish)
  const handleJoinQueue = async (bookId: string) => {
    setActionLoadingId(bookId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/books/${bookId}/queue`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        loadBooks();
      } else {
        setActionMessage({ text: data.error || 'Xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            Kitoblar Katalogi
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Maktab va jamoat kutubxonalari fondidagi kitoblarni qidiring, band holatini kuzating va navbatga yoziling
          </p>
        </div>

        <button
          onClick={() => setAiRecommenderOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all self-start md:self-auto cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>✨ AI Kitob Maslahatchisi</span>
        </button>
      </div>

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

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kitob nomi, muallif yoki qalam kodi (masalan: KTB-001)..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Qidirish</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Kategoriya
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">Barcha kategoriyalar</option>
              {categories.slice(1).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Holati
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">Barchasi</option>
              <option value="AVAILABLE">Bo&apos;sh (Mavjud)</option>
              <option value="BORROWED">Band (Kitobxonda)</option>
              <option value="RESERVED">Bron qilingan</option>
            </select>
          </div>

          {/* Library Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Kutubxona / Maktab
            </label>
            <select
              value={selectedLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Barcha maktab & kutubxonalar</option>
              {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>
                  {lib.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kitoblar katalogi yuklanmoqda...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Kitoblar topilmadi</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Qidiruv so&apos;rovingiz yoki tanlangan filtrlar bo&apos;yicha hech qanday kitob topilmadi. Qidiruvni o&apos;zgartirib ko&apos;ring.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              setSelectedLibrary('');
              loadBooks();
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          >
            Barcha filtrlarni tozalash
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const isAvailable = book.status === 'AVAILABLE';
            const isBorrowed = book.status === 'BORROWED';
            const isReserved = book.status === 'RESERVED';

            return (
              <div
                key={book.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-5 space-y-3.5">
                  {/* Pen Code & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 tracking-wider">
                      {book.code}
                    </span>

                    {isAvailable && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Bo&apos;sh (Mavjud)
                      </span>
                    )}

                    {isBorrowed && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          book.is_overdue
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                            : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            book.is_overdue ? 'bg-rose-600' : 'bg-amber-600'
                          }`}
                        />
                        {book.is_overdue ? "Muddati o'tgan" : 'Band'}
                      </span>
                    )}

                    {isReserved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                        Bron qilingan
                      </span>
                    )}
                  </div>

                  {/* Title & Author */}
                  <div>
                    <Link
                      href={`/books/${book.id}`}
                      className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1"
                    >
                      {book.title}
                    </Link>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">{book.author}</p>
                  </div>

                  {/* Category & Rating */}
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {book.category}
                      </span>
                      {book.rating_avg ? (
                        <span className="flex items-center gap-1 font-semibold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {book.rating_avg} ({book.feedback_count})
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">Baholanmagan</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate pt-1">
                      <Library className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{book.library_name}</span>
                    </div>
                  </div>

                  {/* Current Borrower Info if Borrowed */}
                  {isBorrowed && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500">Hozirgi kitobxon:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{book.current_borrower || 'Kitobxon'}</span>
                      </div>
                      {book.deadline_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Topshirish muddati:</span>
                          <span
                            className={`font-semibold ${
                              book.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {new Date(book.deadline_at).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Queue count indicator */}
                  {book.queue_count > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/50">
                      <Users className="w-3.5 h-3.5" />
                      <span>Navbatda: {book.queue_count} kishi kutmoqda</span>
                    </div>
                  )}
                </div>

                {/* Card Bottom / Actions */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Link
                    href={`/books/${book.id}`}
                    className="flex-1 py-2 px-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                  >
                    Batafsil ko&apos;rish
                  </Link>

                  {currentUser?.role === 'STUDENT' && isAvailable && (
                    <button
                      onClick={() => handleReserve(book.id)}
                      disabled={actionLoadingId === book.id}
                      className="py-2 px-3.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === book.id ? 'Band...' : 'Bron qilish'}</span>
                    </button>
                  )}

                  {currentUser?.role === 'STUDENT' && isBorrowed && (
                    <button
                      onClick={() => handleJoinQueue(book.id)}
                      disabled={actionLoadingId === book.id}
                      className="py-2 px-3.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === book.id ? 'Yozilmoqda...' : 'Navbatga yozilish'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Book Recommender Modal */}
      <AiBookRecommenderModal
        isOpen={aiRecommenderOpen}
        onClose={() => setAiRecommenderOpen(false)}
        libraryId={selectedLibrary || (currentUser as any)?.library_id}
        onSelectBook={(code) => {
          setSearch(code);
          setSelectedCategory('ALL');
          setSelectedStatus('ALL');
        }}
      />
    </div>
  );
}
