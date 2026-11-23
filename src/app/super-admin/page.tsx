'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  AlertTriangle,
  PlusCircle,
  CheckCircle,
  Library,
  UserCheck,
  KeyRound,
  Send,
  Trash2,
  Edit,
  X,
} from 'lucide-react';

interface SuperAdminStats {
  totalLibraries: number;
  totalBooks: number;
  activeBorrows: number;
  overdueCount: number;
  totalUsers: number;
}

interface LibraryItem {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  created_at: string;
  _count?: {
    books: number;
    users: number;
    borrow_records: number;
  };
}

interface LibrarianUser {
  id: string;
  full_name: string;
  login: string;
  library?: {
    id: string;
    name: string;
    type: string;
    location: string;
  } | null;
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [librarians, setLibrarians] = useState<LibrarianUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form: Create Library
  const [libName, setLibName] = useState('');
  const [libType, setLibType] = useState<'Maktab' | 'Kutubxona'>('Maktab');
  const [libLocation, setLibLocation] = useState('');
  const [createLibLoading, setCreateLibLoading] = useState(false);

  // Modal / Form: Edit Library
  const [editingLib, setEditingLib] = useState<LibraryItem | null>(null);
  const [editLibName, setEditLibName] = useState('');
  const [editLibType, setEditLibType] = useState<'Maktab' | 'Kutubxona'>('Maktab');
  const [editLibLocation, setEditLibLocation] = useState('');
  const [editLibStatus, setEditLibStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editLibLoading, setEditLibLoading] = useState(false);

  // Form: Create Librarian
  const [libAdminName, setLibAdminName] = useState('');
  const [libAdminLogin, setLibAdminLogin] = useState('');
  const [libAdminPassword, setLibAdminPassword] = useState('');
  const [assignedLibId, setAssignedLibId] = useState('');
  const [createAdminLoading, setCreateAdminLoading] = useState(false);

  // Action Loading IDs
  const [deletingLibId, setDeletingLibId] = useState<string | null>(null);
  const [deletingLibrarianId, setDeletingLibrarianId] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, libsRes, adminsRes] = await Promise.all([
        fetch('/api/super-admin/stats').then((r) => r.json()),
        fetch('/api/libraries?all=true').then((r) => r.json()),
        fetch('/api/super-admin/librarians').then((r) => r.json()),
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (libsRes.libraries) {
        setLibraries(libsRes.libraries);
        if (libsRes.libraries.length > 0 && !assignedLibId) {
          setAssignedLibId(libsRes.libraries[0].id);
        }
      }
      if (adminsRes.librarians) setLibrarians(adminsRes.librarians);
    } catch (err: any) {
      console.error(err);
      setToast({ text: "Ma'lumotlarni yuklab bo'lmadi", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create Library
  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libName.trim() || !libLocation.trim()) return;

    setCreateLibLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: libName.trim(),
          type: libType,
          location: libLocation.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Maktab / Kutubxona muvaffaqiyatli qo\'shildi!', type: 'success' });
        setLibName('');
        setLibLocation('');
        loadData();
      } else {
        setToast({ text: data.error || 'Qo\'shishda xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setCreateLibLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (lib: LibraryItem) => {
    setEditingLib(lib);
    setEditLibName(lib.name);
    setEditLibType(lib.type as any);
    setEditLibLocation(lib.location);
    setEditLibStatus(lib.status as any);
  };

  // Save Edit Library
  const handleUpdateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLib) return;

    setEditLibLoading(true);
    try {
      const res = await fetch(`/api/libraries/${editingLib.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editLibName.trim(),
          type: editLibType,
          location: editLibLocation.trim(),
          status: editLibStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Muassasa ma\'lumotlari yangilandi!', type: 'success' });
        setEditingLib(null);
        loadData();
      } else {
        setToast({ text: data.error || 'Yangilashda xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setEditLibLoading(false);
    }
  };

  // Delete Library
  const handleDeleteLibrary = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham '${name}' kutubxonasini va uning barcha kitoblarini o'chirmoqchimisiz?`)) {
      return;
    }

    setDeletingLibId(id);
    setToast(null);

    try {
      const res = await fetch(`/api/libraries/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Kutubxona muvaffaqiyatli o\'chirildi', type: 'success' });
        loadData();
      } else {
        setToast({ text: data.error || 'O\'chirishda xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setDeletingLibId(null);
    }
  };

  // Create Librarian Credentials
  const handleCreateLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libAdminName.trim() || !libAdminLogin.trim() || !libAdminPassword.trim() || !assignedLibId) {
      return;
    }

    setCreateAdminLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/super-admin/librarians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: libAdminName.trim(),
          login: libAdminLogin.trim(),
          password: libAdminPassword,
          library_id: assignedLibId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Kutubxonachi login va paroli yaratildi va biriktirildi!', type: 'success' });
        setLibAdminName('');
        setLibAdminLogin('');
        setLibAdminPassword('');
        loadData();
      } else {
        setToast({ text: data.error || 'Kutubxonachi yaratishda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setCreateAdminLoading(false);
    }
  };

  // Delete Librarian
  const handleDeleteLibrarian = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham '${name}' kutubxonachisini o'chirmoqchimisiz?`)) {
      return;
    }

    setDeletingLibrarianId(id);
    setToast(null);

    try {
      const res = await fetch(`/api/super-admin/librarians/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: 'Kutubxonachi hisobi o\'chirildi', type: 'success' });
        loadData();
      } else {
        setToast({ text: data.error || 'O\'chirishda xatolik yuz berdi', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setDeletingLibrarianId(null);
    }
  };

  // Run System Overdue Audit via Telegram
  const handleRunSystemAudit = async () => {
    setAuditLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/cron/check-overdue', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ text: data.message, type: 'success' });
        loadData();
      } else {
        setToast({ text: data.error || 'Auditda xatolik', type: 'error' });
      }
    } catch (e: any) {
      setToast({ text: e.message || 'Server xatosi', type: 'error' });
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            Super Admin Boshqaruv Paneli
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maktab va kutubxona muassasalarini boshqarish (CRUD), kutubxonachilarni biriktirish va umumiy audit
          </p>
        </div>

        <button
          onClick={handleRunSystemAudit}
          disabled={auditLoading}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{auditLoading ? 'Audit bajarilmoqda...' : 'Umumiy Overdue Telegram Auditi'}</span>
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
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline ml-4">
            Yopish
          </button>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Jami Muassasalar
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 dark:text-purple-400">
            {stats?.totalLibraries ?? '0'}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">maktab va kutubxonalar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Umumiy Kitob Fondi
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400">
            {stats?.totalBooks ?? '0'}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">barcha filiallar bo&apos;yicha</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Faol Qarzlar
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.activeBorrows ?? '0'}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">o&apos;quvchilarda o&apos;qilayotgan</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Muddati O&apos;tganlar
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats?.overdueCount ?? '0'}
          </div>
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">kechikkan kitoblar</div>
        </div>
      </div>

      {/* Section 1: Maktab va Kutubxonalarni boshqarish (CRUD) */}
      <section className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Yangi Maktab yoki Kutubxona qo&apos;shish
          </h2>

          <form onSubmit={handleCreateLibrary} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Muassasa nomi
              </label>
              <input
                type="text"
                required
                value={libName}
                onChange={(e) => setLibName(e.target.value)}
                placeholder="Masalan: 1-sonli ixtisoslashtirilgan maktab"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Turi</label>
              <select
                value={libType}
                onChange={(e) => setLibType(e.target.value as any)}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Maktab">Maktab</option>
                <option value="Kutubxona">Kutubxona</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Manzil / Joylashuv
              </label>
              <input
                type="text"
                required
                value={libLocation}
                onChange={(e) => setLibLocation(e.target.value)}
                placeholder="Toshkent shahri, Yunusobod tumani"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end pt-1">
              <button
                type="submit"
                disabled={createLibLoading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{createLibLoading ? 'Qo\'shilmoqda...' : 'Muassasani Yaratish'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Libraries List with Edit and Delete */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Ro&apos;yxatga olingan maktab va kutubxonalar ({libraries.length})
            </h3>
          </div>

          {libraries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              Hozircha hech qanday maktab yoki kutubxona kiritilmagan. Yuqoridagi formadan birinchi muassasani qo&apos;shing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">Muassasa nomi</th>
                    <th className="px-5 py-3 text-left">Turi</th>
                    <th className="px-5 py-3 text-left">Manzil</th>
                    <th className="px-5 py-3 text-center">Kitoblar</th>
                    <th className="px-5 py-3 text-center">Holat</th>
                    <th className="px-5 py-3 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {libraries.map((lib) => (
                    <tr key={lib.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{lib.name}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {lib.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{lib.location}</td>
                      <td className="px-5 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {lib._count?.books ?? 0}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            lib.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {lib.status === 'ACTIVE' ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(lib)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLibrary(lib.id, lib.name)}
                          disabled={deletingLibId === lib.id}
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
      </section>

      {/* Edit Library Modal */}
      {editingLib && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Muassasani tahrirlash</h3>
              <button
                onClick={() => setEditingLib(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLibrary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomi</label>
                <input
                  type="text"
                  required
                  value={editLibName}
                  onChange={(e) => setEditLibName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Turi</label>
                <select
                  value={editLibType}
                  onChange={(e) => setEditLibType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                >
                  <option value="Maktab">Maktab</option>
                  <option value="Kutubxona">Kutubxona</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Manzil</label>
                <input
                  type="text"
                  required
                  value={editLibLocation}
                  onChange={(e) => setEditLibLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Holati</label>
                <select
                  value={editLibStatus}
                  onChange={(e) => setEditLibStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                >
                  <option value="ACTIVE">Faol (ACTIVE)</option>
                  <option value="INACTIVE">Nofaol (INACTIVE)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLib(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={editLibLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editLibLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section 2: Kutubxonachilarni biriktirish */}
      <section className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Yangi Kutubxonachi Login-Parolini Yaratish & Biriktirish
          </h2>

          {libraries.length === 0 ? (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60">
              Kutubxonachi yaratishdan oldin, yuqoridagi bo&apos;limda kamida bitta maktab yoki kutubxona muassasasini yarating.
            </div>
          ) : (
            <form onSubmit={handleCreateLibrarian} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Kutubxonachi Ism-Familiyasi
                </label>
                <input
                  type="text"
                  required
                  value={libAdminName}
                  onChange={(e) => setLibAdminName(e.target.value)}
                  placeholder="Nodira Qodirova"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Biriktiriladigan Muassasa
                </label>
                <select
                  value={assignedLibId}
                  onChange={(e) => setAssignedLibId(e.target.value)}
                  required
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {libraries.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Login (username)
                </label>
                <input
                  type="text"
                  required
                  value={libAdminLogin}
                  onChange={(e) => setLibAdminLogin(e.target.value)}
                  placeholder="nodira_admin"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Maxfiy Parol
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={libAdminPassword}
                  onChange={(e) => setLibAdminPassword(e.target.value)}
                  placeholder="Kamida 6 belgi"
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={createAdminLoading || libraries.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{createAdminLoading ? 'Yaratilmoqda...' : 'Kutubxonachini Biriktirish'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Librarians Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Biriktirilgan kutubxonachilar ro&apos;yxati ({librarians.length})
            </h3>
          </div>

          {librarians.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              Hozircha biriktirilgan kutubxonachilar yo&apos;q. Yuqoridagi formadan birinchi kutubxonachini qo&apos;shing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">Kutubxonachi</th>
                    <th className="px-5 py-3 text-left">Login</th>
                    <th className="px-5 py-3 text-left">Biriktirilgan Kutubxona / Maktab</th>
                    <th className="px-5 py-3 text-center">Roli</th>
                    <th className="px-5 py-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {librarians.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{admin.full_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">@{admin.login}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {admin.library?.name || 'Biriktirilmagan'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                          Kutubxonachi
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDeleteLibrarian(admin.id, admin.full_name)}
                          disabled={deletingLibrarianId === admin.id}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                          title="Kutubxonachini o'chirish"
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
      </section>
    </div>
  );
}
