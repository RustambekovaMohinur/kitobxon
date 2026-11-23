'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, UserPlus, AlertCircle } from 'lucide-react';

interface LibraryItem {
  id: string;
  name: string;
  type: string;
  location: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [loadingLibs, setLoadingLibs] = useState(true);

  const [fullName, setFullName] = useState('');
  const [libraryId, setLibraryId] = useState('');
  const [className, setClassName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/libraries')
      .then((res) => res.json())
      .then((data) => {
        if (data.libraries && data.libraries.length > 0) {
          setLibraries(data.libraries);
          setLibraryId(data.libraries[0].id);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingLibs(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          library_id: libraryId,
          class_name: className || 'Kitobxon',
          login,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ro'yxatdan o'tishda xatolik yuz berdi");
        setLoading(false);
        return;
      }

      router.push('/my-books');
      router.refresh();
    } catch (err: any) {
      setError('Server bilan bog\'lanishda xatolik yuz berdi');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Kitobxon sifatida ro&apos;yxatdan o&apos;tish
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Maktabingiz yoki shahar kutubxonasini tanlab hisob yarating
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Ism va Familiyangiz
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masalan: Sardor Alimov"
              className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Maktab yoki Kutubxonangizni tanlang
            </label>
            {loadingLibs ? (
              <div className="mt-1 py-2 text-sm text-slate-400">Kutubxonalar ro&apos;yxati yuklanmoqda...</div>
            ) : (
              <select
                value={libraryId}
                onChange={(e) => setLibraryId(e.target.value)}
                required
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                {libraries.map((lib) => (
                  <option key={lib.id} value={lib.id} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                    {lib.name} ({lib.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Sinf yoki Guruh (agar o&apos;quvchi bo&apos;lsangiz)
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Masalan: 10-B sinf"
              className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Yangi Login (foydalanuvchi nomi)
            </label>
            <input
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Masalan: sardor_10b"
              className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Maxfiy Parol
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 6 ta belgi"
              className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || loadingLibs}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Ro&apos;yxatdan o&apos;tkazilmoqda...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Ro&apos;yxatdan o&apos;tish</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          Hisobingiz bormi?{' '}
          <Link href="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700">
            Tizimga kirish
          </Link>
        </div>
      </div>
    </div>
  );
}
