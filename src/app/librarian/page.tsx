'use client';

import { useState, useEffect } from 'react';
import {
  Library,
  BookOpen,
  PlusCircle,
  ArrowRightLeft,
  AlertTriangle,
  Send,
  Search,
  CheckCircle,
  Clock,
  User,
  Users,
  Calendar,
  Sparkles,
  Trash2,
  Edit,
  X,
  UserPlus,
  QrCode,
  Download,
  Copy,
  Check,
  Camera,
  Printer,
  Zap,
} from 'lucide-react';
import AiBookImportModal from '@/components/AiBookImportModal';
import AiCoverRecognitionModal from '@/components/AiCoverRecognitionModal';
import PrintableQrStickersModal from '@/components/PrintableQrStickersModal';
import QRCode from 'qrcode';

interface LibrarianStats {
  totalBooks: number;
  availableBooks: number;
  activeBorrows: number;
  overdueBorrows: number;
  totalStudents: number;
}

interface Book {
  id: string;
  code: string;
  title: string;
  author: string;
  category: string;
  status: 'AVAILABLE' | 'BORROWED' | 'RESERVED';
}

interface Student {
  id: string;
  full_name: string;
  login: string;
  class_name: string | null;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  _count?: {
    borrow_records: number;
  };
}

interface BorrowRecord {
  id: string;
  book_id: string;
  book_code: string;
  book_title: string;
  book_author: string;
  student_id: string;
  student_name: string;
  class_name: string;
  parent_telegram: string;
  borrowed_at: string;
  deadline_at: string;
  status: string;
  is_overdue: boolean;
  days_overdue: number;
}

export default function LibrarianDashboardPage() {
  const [activeTab, setActiveTab] = useState<'issue' | 'books' | 'students' | 'borrows' | 'overdue'>('issue');
  const [stats, setStats] = useState<LibrarianStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Notifications / Toasts
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tab 1: Issue Book Form State
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [issueClassName, setIssueClassName] = useState('');
  const [parentTelegram, setParentTelegram] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [issueLoading, setIssueLoading] = useState(false);

  // Tab 2: Books List & Add Form State
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Badiiy adabiyot');
  const [addBookLoading, setAddBookLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [viewQrCode, setViewQrCode] = useState<{ code: string; title: string; qrUrl: string } | null>(null);
  const [copiedQrModal, setCopiedQrModal] = useState(false);

  // Tab 3: Students Management State
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [newStudentLogin, setNewStudentLogin] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('talaba123');
  const [newStudentTelegram, setNewStudentTelegram] = useState('');
  const [addStudentLoading, setAddStudentLoading] = useState(false);

  // Student Edit Modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const [editStudentTelegram, setEditStudentTelegram] = useState('');
  const [editStudentLoading, setEditStudentLoading] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  // Tab 4 & 5: Borrows & Overdue State
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [borrowSearch, setBorrowSearch] = useState('');
  const [returnLoadingId, setReturnLoadingId] = useState<string | null>(null);
  const [overdueCheckLoading, setOverdueCheckLoading] = useState(false);
  const [quickReturnCode, setQuickReturnCode] = useState('');

  // AI Cover Recognition & Printable Stickers Modals
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [stickerModalOpen, setStickerModalOpen] = useState(false);
  const [viewingStudentBorrows, setViewingStudentBorrows] = useState<Student | null>(null);

  // Load All Dashboard Data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const fetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return {};
          return await res.json();
        } catch (err) {
          console.error(`Xatolik ${url} so'rovida:`, err);
          return {};
        }
      };

      const [statsRes, booksRes, studentsRes, borrowsRes] = await Promise.all([
        fetchJson('/api/librarian/stats'),
        fetchJson('/api/librarian/books'),
        fetchJson('/api/librarian/students'),
        fetchJson('/api/librarian/borrows'),
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (booksRes.books) {
        setBooksList(booksRes.books);
        const avail = booksRes.books.filter((b: Book) => b.status === 'AVAILABLE');
        setAvailableBooks(avail);
        if (avail.length > 0 && !selectedBookId) {
          setSelectedBookId(avail[0].id);
        }
      }
      if (studentsRes.students) {
        setStudents(studentsRes.students);
        if (studentsRes.students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsRes.students[0].id);
          setIssueClassName(studentsRes.students[0].class_name || '');
          setParentTelegram(studentsRes.students[0].telegram_chat_id || '');
        }
      }
      if (borrowsRes.borrows) setBorrows(borrowsRes.borrows);
    } catch (e: any) {
      console.error(e);
      setToast({ text: "Ma'lumotlarni yuklab bo'lmadi", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When selected student changes in Issue form
  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const s = students.find((item) => item.id === studentId);
    if (s) {
      setIssueClassName(s.class_name || '');
      setParentTelegram(s.telegram_chat_id || '');
    }
  };

  // Submit Issue Book
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedStudentId) {
      setToast({ text: "Iltimos, kitob va o'quvchini tanlang", type: 'error' });
      return;
    }

    setIssueLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/librarian/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: selectedBookId,
          student_id: selectedStudentId,
          class_name: issueClassName.trim(),
          parent_telegram: parentTelegram.trim(),
          deadline_days: deadlineDays,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: data.message, type: 'success' });
        loadInitialData();
      } else {
        setToast({ text: data.error || 'Kitob berishda xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setIssueLoading(false);
    }
  };

  // Submit Add Book
  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim() || !newAuthor.trim()) return;

    setAddBookLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/librarian/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          title: newTitle.trim(),
          author: newAuthor.trim(),
          category: newCategory,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Yangi kitob bazaga muvaffaqiyatli qo\'shildi!', type: 'success' });
        setNewCode('');
        setNewTitle('');
        setNewAuthor('');
        loadInitialData();
      } else {
        setToast({ text: data.error || 'Qo\'shishda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setAddBookLoading(false);
    }
  };

  // Submit Add Student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentLogin.trim()) return;

    setAddStudentLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/librarian/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newStudentName.trim(),
          class_name: newStudentClass.trim() || 'Kitobxon',
          login: newStudentLogin.trim(),
          password: newStudentPassword.trim() || 'talaba123',
          telegram_chat_id: newStudentTelegram.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Yangi o\'quvchi muvaffaqiyatli ro\'yxatga olindi!', type: 'success' });
        setNewStudentName('');
        setNewStudentClass('');
        setNewStudentLogin('');
        setNewStudentTelegram('');
        loadInitialData();
      } else {
        setToast({ text: data.error || 'Qo\'shishda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setAddStudentLoading(false);
    }
  };

  // Open Edit Student Modal
  const openEditStudentModal = (st: Student) => {
    setEditingStudent(st);
    setEditStudentName(st.full_name);
    setEditStudentClass(st.class_name || '');
    setEditStudentTelegram(st.telegram_chat_id || '');
  };

  // Submit Edit Student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setEditStudentLoading(true);
    try {
      const res = await fetch(`/api/librarian/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editStudentName.trim(),
          class_name: editStudentClass.trim(),
          telegram_chat_id: editStudentTelegram.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: data.message, type: 'success' });
        setEditingStudent(null);
        loadInitialData();
      } else {
        setToast({ text: data.error || 'Yangilashda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setEditStudentLoading(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham '${name}' o'quvchi hisobini o'chirmoqchimisiz?`)) {
      return;
    }

    setDeletingStudentId(id);
    setToast(null);

    try {
      const res = await fetch(`/api/librarian/students/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: data.message, type: 'success' });
        loadInitialData();
      } else {
        setToast({ text: data.error || "O'chirishda xatolik", type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setDeletingStudentId(null);
    }
  };

  // Return Book Action (by recordId or bookCode)
  const handleReturnBook = async (opts: { recordId?: string; bookCode?: string }) => {
    const key = opts.recordId || opts.bookCode || 'return-action';
    setReturnLoadingId(key);
    setToast(null);

    try {
      const res = await fetch('/api/librarian/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrow_record_id: opts.recordId,
          book_code: opts.bookCode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        let msg = data.message;
        if (data.nextStudentInQueue) {
          msg += ` Navbatdagi o'quvchi (${data.nextStudentInQueue.name}) uchun bron qilindi va Telegram xabar yuborildi!`;
        }
        setToast({ text: msg, type: 'success' });
        setQuickReturnCode('');
        loadInitialData();
      } else {
        setToast({ text: data.error || 'Kitobni qabul qilishda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setReturnLoadingId(null);
    }
  };

  // Run Overdue Check & Telegram Dispatch
  const handleRunOverdueCheck = async () => {
    setOverdueCheckLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/cron/check-overdue', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: data.message, type: 'success' });
        loadInitialData();
      } else {
        setToast({ text: data.error || 'Tekshirishda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setOverdueCheckLoading(false);
    }
  };

  // Filtered lists
  const filteredBooks = booksList.filter((b) => {
    if (!bookSearch.trim()) return true;
    const q = bookSearch.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.login.toLowerCase().includes(q) || (s.class_name && s.class_name.toLowerCase().includes(q));
  });

  const filteredBorrows = borrows.filter((b) => {
    if (!borrowSearch.trim()) return true;
    const q = borrowSearch.toLowerCase();
    return (
      b.book_title.toLowerCase().includes(q) ||
      b.book_code.toLowerCase().includes(q) ||
      b.student_name.toLowerCase().includes(q) ||
      b.class_name.toLowerCase().includes(q)
    );
  });

  const overdueList = borrows.filter((b) => b.is_overdue);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Library className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Kutubxonachi Ishchi Paneli
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kitob berish, kitoblar va o&apos;quvchilarni boshqarish hamda muddati o&apos;tgan kitoblarni nazorat qilish
          </p>
        </div>

        <button
          onClick={handleRunOverdueCheck}
          disabled={overdueCheckLoading}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{overdueCheckLoading ? 'Tekshirilmoqda...' : 'Muddati o\'tganlarni tekshirish & Telegram'}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between shadow-sm transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline ml-4 hover:opacity-80">
            Yopish
          </button>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Jami Kitoblar
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.totalBooks ?? '0'}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {stats?.availableBooks ?? 0} tasi bo&apos;sh (mavjud)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Faol Qarzlar
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400">
            {stats?.activeBorrows ?? '0'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">o&apos;quvchilar qo&apos;lida</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Muddati O&apos;tgan
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats?.overdueBorrows ?? '0'}
          </div>
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">ogohlantirish talab etiladi</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            O&apos;quvchilar Soni
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 dark:text-purple-400">
            {stats?.totalStudents ?? '0'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">ro&apos;yxatdagi kitobxonlar</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('issue')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'issue'
              ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Kitob berish (Chiqim)
        </button>

        <button
          onClick={() => setActiveTab('books')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'books'
              ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Kitoblar & Qo&apos;shish ({booksList.length})
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> O&apos;quvchilar Boshqaruvi ({students.length})
        </button>

        <button
          onClick={() => setActiveTab('borrows')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'borrows'
              ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> Faol qarzlar & Qaytarish ({borrows.length})
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overdue'
              ? 'border-rose-600 dark:border-rose-400 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Muddati o&apos;tganlar ({overdueList.length})
        </button>
      </div>

      {/* Tab 1: Kitob Berish */}
      {activeTab === 'issue' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              O&apos;quvchiga kitob berish (Rasmiylashtirish)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bo&apos;sh kitobni tanlang, o&apos;quvchi va ota-onaning Telegram ma&apos;lumotlarini biriktirib qaytarish muddatini belgilang.
            </p>
          </div>

          {availableBooks.length === 0 || students.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Kitob berishdan oldin:</h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                {availableBooks.length === 0 && (
                  <li>Kutubxonangizda bo&apos;sh kitob mavjud emas. Avval &apos;Kitoblar & Qo&apos;shish&apos; tabida yangi kitob qo&apos;shing.</li>
                )}
                {students.length === 0 && (
                  <li>Kutubxonangizga biriktirilgan o&apos;quvchi mavjud emas. Avval &apos;O&apos;quvchilar Boshqaruvi&apos; tabida o&apos;quvchini ro&apos;yxatga oling.</li>
                )}
              </ul>
              <div className="flex gap-2 pt-2">
                {availableBooks.length === 0 && (
                  <button
                    onClick={() => setActiveTab('books')}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Kitob qo&apos;shishga o&apos;tish
                  </button>
                )}
                {students.length === 0 && (
                  <button
                    onClick={() => setActiveTab('students')}
                    className="px-3.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold"
                  >
                    O&apos;quvchi qo&apos;shishga o&apos;tish
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleIssueSubmit} className="max-w-2xl space-y-5">
              {/* Book Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Kitobni tanlang (Faqat bo&apos;sh kitoblar)
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  required
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                      [{b.code}] {b.title} — {b.author}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Kitobxon / O&apos;quvchini tanlang
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  required
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                      {s.full_name} ({s.class_name || 'Kitobxon'}) — @{s.login}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class name & Parent Telegram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Sinf / Guruh
                  </label>
                  <input
                    type="text"
                    value={issueClassName}
                    onChange={(e) => setIssueClassName(e.target.value)}
                    placeholder="Masalan: 10-A sinf"
                    className="w-full py-2 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Ota-ona yoki O&apos;quvchi Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={parentTelegram}
                    onChange={(e) => setParentTelegram(e.target.value)}
                    placeholder="Masalan: 12345678"
                    className="w-full py-2 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Deadline select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Qaytarish muddati
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDeadlineDays(days)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        deadlineDays === days
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {days} kun
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={issueLoading || availableBooks.length === 0 || students.length === 0}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{issueLoading ? 'Rasmiylashtirilmoqda...' : 'Kitobni Berish'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: Kitoblar ro'yxati & Yangi qo'shish */}
      {activeTab === 'books' && (
        <div className="space-y-6">
          {/* Add Book Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Yangi kitob qo&apos;shish
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCoverModalOpen(true)}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-pink-200" />
                  <span>📸 Muqovani Skanerlash (AI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiModalOpen(true)}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-violet-500/20 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>✨ AI Jadvaldan Import</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStickerModalOpen(true)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-300" />
                  <span>🖨 QR Stikerlar (A4)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddBookSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Qalam kodi (KTB-001)
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="KTB-101"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kitob nomi</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="O'tkan kunlar"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Muallif</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Abdulla Qodiriy"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Kategoriya</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Badiiy adabiyot">Badiiy adabiyot</option>
                  <option value="Tarixiy roman">Tarixiy roman</option>
                  <option value="Jahon adabiyoti">Jahon adabiyoti</option>
                  <option value="Shaxsiy rivojlanish">Shaxsiy rivojlanish</option>
                  <option value="Klassika">Klassika</option>
                  <option value="Darslik">Darslik</option>
                </select>
              </div>

              <div className="sm:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addBookLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{addBookLoading ? 'Qo\'shilmoqda...' : 'Kitobni Bazaga Kiritish'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Books Table with Quick Lookup */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Kodi yoki nomi bo'yicha tezkor qidiruv..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Jami: {filteredBooks.length} ta kitob
              </span>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                Hozircha kitoblar mavjud emas. Yuqoridagi formadan birinchi kitobni qo&apos;shing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Kodi</th>
                      <th className="px-5 py-3 text-left">Kitob nomi</th>
                      <th className="px-5 py-3 text-left">Muallif</th>
                      <th className="px-5 py-3 text-left">Kategoriya</th>
                      <th className="px-5 py-3 text-center">QR Kod</th>
                      <th className="px-5 py-3 text-right">Holati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{book.code}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{book.title}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{book.author}</td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{book.category}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const qr = await QRCode.toDataURL(`KITOBXON:${book.code}`, { width: 200, margin: 1 });
                                setViewQrCode({ code: book.code, title: book.title, qrUrl: qr });
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-colors inline-flex items-center gap-1"
                            title="QR kodni ko'rish"
                          >
                            <QrCode className="w-4 h-4" />
                            <span className="text-[11px] font-semibold hidden sm:inline">QR</span>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {book.status === 'AVAILABLE' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              Bo&apos;sh
                            </span>
                          )}
                          {book.status === 'BORROWED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              Band
                            </span>
                          )}
                          {book.status === 'RESERVED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              Bron qilingan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: O'quvchilar Boshqaruvi */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Add Student Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Yangi O&apos;quvchi / Kitobxonni Ro&apos;yxatga Olish
            </h2>

            <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Ism-Familiya
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Jasurbek Karimov"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Sinf / Guruh
                </label>
                <input
                  type="text"
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                  placeholder="10-A sinf"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Login (username)
                </label>
                <input
                  type="text"
                  required
                  value={newStudentLogin}
                  onChange={(e) => setNewStudentLogin(e.target.value)}
                  placeholder="jasurbek_10a"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Parol
                </label>
                <input
                  type="text"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder="talaba123"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={newStudentTelegram}
                  onChange={(e) => setNewStudentTelegram(e.target.value)}
                  placeholder="12345678 (ixtiyoriy)"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-5 flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={addStudentLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{addStudentLoading ? 'Qo\'shilmoqda...' : 'O\'quvchini Ro\'yxatga Olish'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Students List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Ism, login yoki sinf bo'yicha qidiruv..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Jami: {filteredStudents.length} ta o&apos;quvchi
              </span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                Hozircha o&apos;quvchilar ro&apos;yxatga olinmagan. Yuqoridagi formadan birinchi o&apos;quvchini qo&apos;shing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">F.I.SH</th>
                      <th className="px-5 py-3 text-left">Sinf / Guruh</th>
                      <th className="px-5 py-3 text-left">Login</th>
                      <th className="px-5 py-3 text-left">Telegram Chat ID</th>
                      <th className="px-5 py-3 text-center">Faol Kitoblar</th>
                      <th className="px-5 py-3 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{st.full_name}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-medium">{st.class_name || '—'}</td>
                        <td className="px-5 py-3 font-mono text-xs text-purple-600 dark:text-purple-400">@{st.login}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {st.telegram_chat_id ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">{st.telegram_chat_id}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Ulanmagan</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingStudentBorrows(st)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-950 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 transition-colors cursor-pointer border border-transparent hover:border-blue-300 dark:hover:border-blue-700"
                            title="O'quvchining qarz kitoblarini ko'rish va qaytarish"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{st._count?.borrow_records ?? 0} ta</span>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right space-x-1">
                          <button
                            onClick={() => openEditStudentModal(st)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.full_name)}
                            disabled={deletingStudentId === st.id}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">O&apos;quvchini tahrirlash</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ism-Familiya</label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sinf / Guruh</label>
                <input
                  type="text"
                  value={editStudentClass}
                  onChange={(e) => setEditStudentClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  value={editStudentTelegram}
                  onChange={(e) => setEditStudentTelegram(e.target.value)}
                  placeholder="Masalan: 12345678"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={editStudentLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editStudentLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Faol qarzlar va Qaytarib olish */}
      {activeTab === 'borrows' && (
        <div className="space-y-6">
          {/* Quick Return Bar */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-300" />
                Tezkor kitob qaytarish (Skaner / Kod)
              </h3>
              <p className="text-xs text-blue-100 max-w-xl">
                Kitobning QR kodini skanerlang yoki kitob kodini (masalan: <b>KTB-0001</b>) kiriting. Tizim bir zumda qarzni yopadi, kitobni bo&apos;shatadi va navbatdagi o&apos;quvchiga xabar yuboradi.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (quickReturnCode.trim()) {
                  handleReturnBook({ bookCode: quickReturnCode.trim() });
                }
              }}
              className="flex items-center gap-2 max-w-md w-full"
            >
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={quickReturnCode}
                  onChange={(e) => setQuickReturnCode(e.target.value)}
                  placeholder="KTB-0001 yoki QR..."
                  className="w-full pl-9 pr-3 py-2.5 bg-white text-slate-900 placeholder-slate-400 font-mono font-bold uppercase rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={returnLoadingId !== null || !quickReturnCode.trim()}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex-shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {returnLoadingId === quickReturnCode.trim() ? 'Qabul...' : '⚡️ Qaytarildi'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={borrowSearch}
                  onChange={(e) => setBorrowSearch(e.target.value)}
                  placeholder="Kitob kodi, nomi yoki o'quvchi ismi..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Faol qarzlar: {filteredBorrows.length} ta
              </span>
            </div>

            {filteredBorrows.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                Faol qarz yozuvlari topilmadi
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Kitob</th>
                      <th className="px-5 py-3 text-left">O&apos;quvchi & Sinf</th>
                      <th className="px-5 py-3 text-left">Ota-ona Telegram</th>
                      <th className="px-5 py-3 text-left">Topshirish muddati</th>
                      <th className="px-5 py-3 text-center">Holat</th>
                      <th className="px-5 py-3 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBorrows.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3">
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{record.book_code}</div>
                          <div className="font-semibold text-slate-900 dark:text-white">{record.book_title}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{record.student_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{record.class_name}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {record.parent_telegram}
                        </td>
                        <td className="px-5 py-3">
                          <div className={`font-semibold ${record.is_overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {new Date(record.deadline_at).toLocaleDateString('uz-UZ')}
                          </div>
                          {record.is_overdue && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                              {record.days_overdue} kun kechikdi!
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {record.is_overdue ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                              Muddati o&apos;tgan
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              O&apos;qilmoqda
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleReturnBook({ recordId: record.id })}
                            disabled={returnLoadingId === record.id}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{returnLoadingId === record.id ? 'Qabul qilinmoqda...' : '✅ Qaytarildi'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Muddati o'tganlar nazorati & Telegram */}
      {activeTab === 'overdue' && (
        <div className="space-y-6">
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                Muddati o&apos;tgan kitoblar avtomatlashtirilgan nazorati
              </h2>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-2xl">
                Quyidagi ro&apos;yxatda topshirish muddati o&apos;tib ketgan barcha kitoblar keltirilgan. Tugmani bosish orqali barcha ota-onalarga va o&apos;quvchilarga Telegram xabarnoma yuborishingiz mumkin.
              </p>
            </div>

            <button
              onClick={handleRunOverdueCheck}
              disabled={overdueCheckLoading}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-rose-500/25 transition-all flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{overdueCheckLoading ? 'Yuborilmoqda...' : 'Barchasiga Telegram Xabar Yuborish'}</span>
            </button>
          </div>

          {/* Overdue Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            {overdueList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Ajoyib! Muddati o&apos;tgan kitoblar mavjud emas.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Barcha o&apos;quvchilar kitoblarni o&apos;z vaqtida topshirmoqda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  <thead className="bg-rose-50/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Kitob kodi & Nomi</th>
                      <th className="px-5 py-3 text-left">O&apos;quvchi</th>
                      <th className="px-5 py-3 text-left">Sinf</th>
                      <th className="px-5 py-3 text-left">Ota-ona Telegram</th>
                      <th className="px-5 py-3 text-left">Muddat</th>
                      <th className="px-5 py-3 text-left">Kechikish</th>
                      <th className="px-5 py-3 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overdueList.map((rec) => (
                      <tr key={rec.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-950/30">
                        <td className="px-5 py-3">
                          <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 mr-2">[{rec.book_code}]</span>
                          <span className="font-bold text-slate-900 dark:text-white">{rec.book_title}</span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{rec.student_name}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{rec.class_name}</td>
                        <td className="px-5 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{rec.parent_telegram}</td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(rec.deadline_at).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded font-extrabold text-xs bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                            {rec.days_overdue} kun!
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleReturnBook({ recordId: rec.id })}
                            disabled={returnLoadingId === rec.id}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{returnLoadingId === rec.id ? 'Qabul qilinmoqda...' : '✅ Qaytarildi'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Smart Book Import Modal */}
      <AiBookImportModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSuccess={(count) => {
          loadInitialData();
          setToast({ text: `${count} ta kitob muvaffaqiyatli saqlandi!`, type: 'success' });
        }}
      />

      {/* Book QR Code Modal */}
      {viewQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Kitob QR Kodi
              </h3>
              <button
                onClick={() => setViewQrCode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {viewQrCode.code}
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {viewQrCode.title}
              </p>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner mx-auto">
              <img
                src={viewQrCode.qrUrl}
                alt={`QR for ${viewQrCode.code}`}
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <a
                href={viewQrCode.qrUrl}
                download={`${viewQrCode.code}-qr.png`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Yuklab olish</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`KITOBXON:${viewQrCode.code}`);
                  setCopiedQrModal(true);
                  setTimeout(() => setCopiedQrModal(false), 2000);
                }}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedQrModal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQrModal ? "Nusxalandi!" : "Kodni nusxalash"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Active Borrows Modal */}
      {viewingStudentBorrows && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>{viewingStudentBorrows.full_name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingStudentBorrows.class_name || 'Kitobxon'} | @{viewingStudentBorrows.login}
                </p>
              </div>
              <button
                onClick={() => setViewingStudentBorrows(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {(() => {
                const studentActiveLoans = borrows.filter((b) => b.student_id === viewingStudentBorrows.id);
                if (studentActiveLoans.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Ushbu o&apos;quvchida hozirda olingan faol kitoblar yo&apos;q.
                    </div>
                  );
                }

                return studentActiveLoans.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          [{b.book_code}]
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {b.book_title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Muddat: {new Date(b.deadline_at).toLocaleDateString('uz-UZ')}{' '}
                        {b.is_overdue && (
                          <span className="text-rose-600 font-bold ml-1">
                            ({b.days_overdue} kun kechikdi!)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleReturnBook({ recordId: b.id })}
                      disabled={returnLoadingId === b.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{returnLoadingId === b.id ? 'Qabul...' : '✅ Qaytarildi'}</span>
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* AI Cover Photo Recognition Modal */}
      <AiCoverRecognitionModal
        isOpen={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onApplyToForm={(detected) => {
          setNewTitle(detected.title);
          setNewAuthor(detected.author);
          setNewCategory(detected.category);
          if (!newCode && booksList.length > 0) {
            setNewCode(`KTB-${String(booksList.length + 1).padStart(3, '0')}`);
          }
          setToast({ text: `AI: "${detected.title}" ma'lumotlari formaga joylandi!`, type: 'success' });
        }}
      />

      {/* Printable QR Stickers Modal */}
      <PrintableQrStickersModal
        isOpen={stickerModalOpen}
        onClose={() => setStickerModalOpen(false)}
        books={booksList}
        libraryName="Kitobxon Maktab Kutubxonasi"
      />
    </div>
  );
}
