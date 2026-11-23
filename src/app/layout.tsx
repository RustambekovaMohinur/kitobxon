import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kitobxon — Maktab va Xalq Kutubxonalari Uchun Yagona Raqamli Tizim',
  description: "O'zbekiston maktab va jamoat kutubxonalari uchun qalam bilan yozilgan kodlar bo'yicha qidiruv, aqlli navbat tizimi va Telegram bot (@kitobxon_rasmiy_bot) orqali muddati o'tgan kitoblar nazorati platformasi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('kitobxon_theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 py-6 mt-16 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Kitobxon</span>
              <span>— Maktab va kutubxona boshqaruvi platformasi</span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Kitobxon. Barcha huquqlar himoyalangan.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
