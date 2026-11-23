'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, LogOut, User, ShieldCheck, Library, BookmarkCheck, Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface CurrentUserData {
  id: string;
  full_name: string;
  login: string;
  role: 'SUPER_ADMIN' | 'LIBRARIAN' | 'STUDENT';
  library?: {
    id: string;
    name: string;
  } | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <ShieldCheck className="w-3 h-3" /> Super Admin
          </span>
        );
      case 'LIBRARIAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <Library className="w-3 h-3" /> Kutubxonachi
          </span>
        );
      case 'STUDENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <User className="w-3 h-3" /> Kitobxon
          </span>
        );
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 dark:from-brand-400 dark:via-brand-300 dark:to-blue-200 bg-clip-text text-transparent">
                  Kitobxon
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 -mt-1">
                  Kutubxonalar Portali
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/books"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/books'
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Kitoblar katalogi
              </Link>

              {user?.role === 'STUDENT' && (
                <Link
                  href="/my-books"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/my-books'
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookmarkCheck className="w-4 h-4" /> Mening kitoblarim
                </Link>
              )}

              {user?.role === 'LIBRARIAN' && (
                <Link
                  href="/librarian"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/librarian'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Library className="w-4 h-4" /> Kutubxonachi paneli
                </Link>
              )}

              {user?.role === 'SUPER_ADMIN' && (
                <Link
                  href="/super-admin"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/super-admin'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Super Admin
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Right: Theme Toggle & User Info */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {!loading && user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  {user.library && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={user.library.name}>
                      {user.library.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Tizimdan chiqish"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : !loading ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Kirish
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  Ro&apos;yxatdan o&apos;tish
                </Link>
              </div>
            ) : null}
          </div>

          {/* Mobile right items (Theme toggle + hamburger) */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60"
              aria-label="Menyu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/books"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Kitoblar katalogi
          </Link>

          {user?.role === 'STUDENT' && (
            <Link
              href="/my-books"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60"
            >
              Mening kitoblarim
            </Link>
          )}

          {user?.role === 'LIBRARIAN' && (
            <Link
              href="/librarian"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60"
            >
              Kutubxonachi paneli
            </Link>
          )}

          {user?.role === 'SUPER_ADMIN' && (
            <Link
              href="/super-admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60"
            >
              Super Admin paneli
            </Link>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</span>
                  {getRoleBadge(user.role)}
                </div>
                {user.library && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.library.name}</p>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/50"
                >
                  <LogOut className="w-4 h-4" /> Chiqish
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Kirish
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                >
                  Ro&apos;yxatdan o&apos;tish
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
