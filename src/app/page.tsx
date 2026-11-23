'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BookOpen,
  Search,
  Users,
  BellRing,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Library,
  Star,
  LogIn,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [quickSearch, setQuickSearch] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      router.push(`/books?search=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      router.push('/books');
    }
  };

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 dark:from-slate-900 dark:via-brand-950 dark:to-slate-950 text-white p-8 sm:p-14 shadow-2xl border border-brand-700/50 dark:border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-brand-500/10 dark:bg-brand-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs sm:text-sm font-medium backdrop-blur">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>O&apos;zbekiston maktab va jamoat kutubxonalari uchun yagona raqamli tizim</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Kitoblarni boshqarish va mutolaa madaniyatini <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">yangi bosqichga</span> olib chiqing
            </h1>

            <p className="text-base sm:text-lg text-brand-100/90 dark:text-slate-300 leading-relaxed">
              Qalam bilan yozilgan kitob raqamlari (KTB-001) bo&apos;yicha bir lahzalik qidiruv, avtomatlashtirilgan navbat tizimi va ota-onalar hamda o&apos;quvchilarga Telegram bot (@kitobxon_rasmiy_bot) orqali muddati o&apos;tgan kitoblar bo&apos;yicha tezkor eslatmalar.
            </p>

            {/* Quick Search Form */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="flex flex-col sm:flex-row items-center gap-2 max-w-2xl bg-white dark:bg-slate-900/95 p-2 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700">
                <div className="flex-1 flex items-center gap-3 px-3 w-full">
                  <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Kitob nomi, muallif yoki kodi (masalan: KTB-001)..."
                    className="w-full text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent text-sm sm:text-base focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-brand-500/25 flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <span>Qidirish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href="/login"
                className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 border border-transparent dark:border-slate-700"
              >
                <LogIn className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Tizimga kirish</span>
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 bg-brand-700/80 hover:bg-brand-600 text-white border border-brand-500/30 rounded-xl text-sm font-semibold transition-all backdrop-blur"
              >
                Yangi kitobxon ro&apos;yxatdan o&apos;tishi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Nega aynan Kitobxon?
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            O&apos;zbekiston ta&apos;lim muassasalari va kutubxonalari uchun maxsus moslashtirilgan qulayliklar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Qalam Kodlari Qidiruvi</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Kitob muqovasiga qalam bilan yozilgan maxsus raqamlar (e.g. <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-xs">KTB-001</code>) orqali soniyalar ichida kitobni topish va holatini ko&apos;rish.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aqlli Navbat Tizimi</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Agar kitob band bo&apos;lsa, o&apos;quvchi 1-klikda navbatga yoziladi. Kitob topshirilishi bilan 1-o&apos;rindagi o&apos;quvchiga avtomatik xabar boradi.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BellRing className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Telegram Bot Eslatmasi</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Muddati o&apos;tgan kitoblar bo&apos;yicha ota-ona va o&apos;quvchining Telegramiga aniq kechikish kunlari ko&apos;rsatilgan ogohlantirish xabarlari boradi.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fikrlar va Reyting</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              O&apos;quvchilar o&apos;qigan kitoblari bo&apos;yicha 5 yulduzli baho va tavsiyalar qoldirib, yulduz ballari to&apos;playdi va boshqalarni ilhomlantiradi.
            </p>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 dark:bg-slate-900/90 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 border border-slate-800 dark:border-slate-800">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Kutubxonangizni bugunoq raqamlashtiring
          </h2>
          <p className="max-w-xl mx-auto text-slate-300 text-sm sm:text-base">
            O&apos;quvchi sifatida ro&apos;yxatdan o&apos;ting yoki mavjud kutubxonachi profilingiz orqali tizimga kiring.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/books"
              className="px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-brand-500/25 transition-all"
            >
              Katalogni ko&apos;rish
            </Link>
            <Link
              href="/register"
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl font-semibold transition-all"
            >
              Ro&apos;yxatdan o&apos;tish
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
