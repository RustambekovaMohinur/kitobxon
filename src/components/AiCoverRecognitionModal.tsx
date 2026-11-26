'use client';

import { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface ExistingBook {
  id: string;
  code: string;
  title: string;
  author: string;
  category: string;
  status: 'AVAILABLE' | 'BORROWED' | 'RESERVED';
}

interface AiCoverRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToForm: (book: { title: string; author: string; category: string }) => void;
}

export default function AiCoverRecognitionModal({
  isOpen,
  onClose,
  onApplyToForm,
}: AiCoverRecognitionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{
    detected: { title: string; author: string; category: string };
    existing_books: ExistingBook[];
    is_in_library: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg('Iltimos, avval kitob muqovasi suratini tanlang yoki rasmga oling');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/books/recognize-cover', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
      } else {
        setErrorMsg(data.error || 'Muqovani tahlil qilishda xatolik yuz berdi');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server bilan bog\'lanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Camera className="w-3.5 h-3.5" />
              <span>Gemini Vision AI</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Kitob muqovasini skanerlash
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Kitob muqovasini suratga oling yoki yuklang. AI uning nomi, muallifi va janrini aniqlab, katalogdagi mavjudligini ko&apos;rsatadi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload / Camera Zone */}
        {!previewUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-400 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Suratni tanlash yoki rasmga olish uchun bosing
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                JPG, PNG, WEBP (Kitob muqovasi aniq ko&apos;ringan bo&apos;lishi tavsiya etiladi)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center max-h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Kitob muqovasi"
                className="max-h-64 object-contain"
              />
              <button
                onClick={handleReset}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-colors"
                title="Boshqa surat tanlash"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!result && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'AI muqovani tahlil qilmoqda...' : 'Muqovani tahlil qilish'}</span>
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results Area */}
        {result && (
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI tomonidan aniqlangan ma&apos;lumotlar:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Kitob nomi:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {result.detected.title}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Muallif:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {result.detected.author}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 dark:text-slate-500 block">Kategoriya / Janr:</span>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                    {result.detected.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Catalog Matches */}
            {result.is_in_library ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Kutubxonangizda ushbu kitobdan nusxalar mavjud ({result.existing_books.length} ta):</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {result.existing_books.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          [{b.code}]
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                          {b.title}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          b.status === 'AVAILABLE'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {b.status === 'AVAILABLE' ? "Mavjud" : "O'qilmoqda"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                ℹ️ Ushbu kitob hali sizning kutubxona katalogingizda yo&apos;q. Quyidagi tugma orqali uni bir zumda yangi kitob sifatida qo&apos;shishingiz mumkin.
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Yana skanerlash
              </button>
              <button
                onClick={() => {
                  onApplyToForm(result.detected);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
              >
                <span>Formani to&apos;ldirish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
