'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, LogIn, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login yoki parol noto'g'ri");
        setLoading(false);
        return;
      }

      const destination = redirectParam || data.redirectUrl || '/books';
      router.push(destination);
      router.refresh();
    } catch (err: any) {
      setError("Server bilan bog'lanishda xatolik yuz berdi");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Kitobxon tizimiga kirish
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Shaxsiy profilingizga kirish uchun login va maxfiy parolingizni kiriting
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Login (foydalanuvchi nomi)
          </label>
          <input
            type="text"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Foydalanuvchi logini"
            className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Maxfiy parol
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-md hover:shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Tekshirilmoqda...</span>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Kirish</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
        O&apos;quvchi sifatida birinchi marta kirdingizmi?{' '}
        <Link href="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 block mt-1">
          Yangi kitobxon sifatida ro&apos;yxatdan o&apos;tish →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-sm text-slate-400">Yuklanmoqda...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
