'use client';

import { useState, useEffect } from 'react';
import {
  Printer,
  X,
  CheckSquare,
  Square,
  Search,
  Download,
  QrCode,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';

interface BookItem {
  id: string;
  code: string;
  title: string;
  author: string;
  category?: string;
}

interface PrintableQrStickersModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookItem[];
  libraryName?: string;
}

export default function PrintableQrStickersModal({
  isOpen,
  onClose,
  books,
  libraryName = 'Kitobxon Kutubxonasi',
}: PrintableQrStickersModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  // Modal ochilganda avtomatik barcha kitoblarni tanlash
  useEffect(() => {
    if (isOpen && books.length > 0) {
      setSelectedIds(new Set(books.map((b) => b.id)));
    }
  }, [isOpen, books]);

  // Tanlangan kitoblar uchun QR kodlarni generatsiya qilish
  useEffect(() => {
    if (!isOpen || selectedIds.size === 0) return;

    let isMounted = true;
    setGenerating(true);

    const generateQrs = async () => {
      const generated: Record<string, string> = {};
      const selectedBooks = books.filter((b) => selectedIds.has(b.id));

      for (const b of selectedBooks) {
        try {
          const payload = `KITOBXON:${b.code}`;
          const dataUrl = await QRCode.toDataURL(payload, {
            width: 140,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          generated[b.id] = dataUrl;
        } catch (e) {
          console.error('QR yaratish xatosi:', e);
        }
      }

      if (isMounted) {
        setQrCodes(generated);
        setGenerating(false);
      }
    };

    generateQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIds, books]);

  if (!isOpen) return null;

  const filteredBooks = books.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === books.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(books.map((b) => b.id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedList = books.filter((b) => selectedIds.has(b.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 my-6 max-h-[92vh] flex flex-col">
        {/* Header - No print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 no-print flex-shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              <QrCode className="w-3.5 h-3.5" />
              <span>A4 Stiker Varaqi (Print / PDF)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Kitoblar uchun QR stikerlar
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tanlangan kitoblar stikerini A4 qog&apos;ozga (yoki yopishqoq stiker qog&apos;oziga) 3 ustunli formatda chop eting yoki PDF sifatida saqlang.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handlePrint}
              disabled={selectedList.length === 0 || generating}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Chop etish (Print / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls - No print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600"
            >
              {selectedIds.size === books.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Barchasini tanlash ({selectedIds.size}/{books.length})</span>
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidirish (kod, nom, muallif)..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {generating ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">QR kodlar tayyorlanmoqda...</p>
            </div>
          ) : selectedList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Hech qanday kitob tanlanmagan. Chop etish uchun kamida bitta kitobni tanlang.
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 no-print">
                A4 Varaq ko&apos;rinishi ({selectedList.length} ta stiker):
              </div>

              {/* Printable Grid Area */}
              <div
                id="printable-qr-sheet"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-white text-slate-900 rounded-2xl border border-slate-200"
              >
                {selectedList.map((book) => {
                  const qr = qrCodes[book.id];
                  return (
                    <div
                      key={book.id}
                      className="qr-sticker-card border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between text-slate-900 relative break-inside-avoid"
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      {/* Checkbox for deselecting inside preview (hidden on print) */}
                      <button
                        type="button"
                        onClick={() => handleToggle(book.id)}
                        className="absolute top-2 right-2 no-print p-1 text-slate-300 hover:text-rose-500 transition-colors"
                        title="Tanlovdan chiqarish"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Header */}
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2 truncate">
                        {libraryName}
                      </div>

                      {/* Body: QR + Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-white p-1 rounded-lg border border-slate-200">
                          {qr ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={qr} alt={book.code} className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-[9px] text-slate-400">QR...</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="font-mono font-extrabold text-sm sm:text-base text-slate-900 tracking-wider">
                            {book.code}
                          </div>
                          <div className="font-bold text-xs text-slate-800 line-clamp-2 leading-tight">
                            {book.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {book.author}
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="text-[9px] text-slate-400 text-right pt-1 mt-1 border-t border-slate-100">
                        Kitobxon Platformasi
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-qr-sheet,
          #printable-qr-sheet * {
            visibility: visible !important;
          }
          #printable-qr-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          .qr-sticker-card {
            border: 1px dashed #64748b !important;
            padding: 8px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
