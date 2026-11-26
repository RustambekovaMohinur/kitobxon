'use client';

import { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  X,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Plus,
  QrCode,
  Download,
  Copy,
  Check,
  FileText,
  RefreshCw,
} from 'lucide-react';

export interface AiImportItem {
  temp_id: string;
  book_code: string;
  title: string;
  author: string;
  category: string;
  copies_count: number;
  is_duplicate: boolean;
  duplicate_info: string | null;
  qr_data: string;
  qr_preview: string;
}

const CATEGORY_OPTIONS = [
  'Badiiy adabiyot',
  'Darslik va o\'quv qo\'llanma',
  'Ilmiy-ommabop',
  'Bolalar adabiyoti',
  'Xorijiy adabiyot',
  'Diniy-ma\'rifiy',
  'Tarixiy roman',
  'Boshqa',
];

interface AiBookImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export default function AiBookImportModal({
  isOpen,
  onClose,
  onSuccess,
}: AiBookImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview State
  const [items, setItems] = useState<AiImportItem[]>([]);
  const [successInfo, setSuccessInfo] = useState<{ count: number; message: string } | null>(null);

  // QR Preview Modal
  const [qrModalItem, setQrModalItem] = useState<AiImportItem | null>(null);
  const [copiedQr, setCopiedQr] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setTextInput('');
    setShowTextInput(false);
    setLoading(false);
    setConfirmLoading(false);
    setError(null);
    setItems([]);
    setSuccessInfo(null);
    setQrModalItem(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  // Step 1: Submit to AI Preview
  const handleAnalyze = async () => {
    if (!file && !textInput.trim()) {
      setError("Iltimos, jadval faylini (.xlsx, .xls, .csv, rasm, pdf) tanlang yoki matn kiriting");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else if (textInput.trim()) {
        formData.append('text', textInput.trim());
      }

      const res = await fetch('/api/books/ai-import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Faylni tahlil qilishda xatolik yuz berdi");
      }

      if (!data.items || data.items.length === 0) {
        throw new Error("Jadvaldan kitoblar topilmadi. Ustunlar mavjudligini tekshiring.");
      }

      setItems(data.items);
    } catch (err: any) {
      console.error('AI Preview xatosi:', err);
      setError(err.message || "Tahlil jarayonida kutilmagan xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Item field update
  const handleUpdateItem = (tempId: string, field: keyof AiImportItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.temp_id === tempId ? { ...item, [field]: value } : item))
    );
  };

  // Delete item row
  const handleDeleteItem = (tempId: string) => {
    setItems((prev) => prev.filter((item) => item.temp_id !== tempId));
  };

  // Add blank item row
  const handleAddItem = () => {
    const nextNum = items.length + 1;
    const newCode = `KTB-${String(1000 + nextNum)}`;
    const newItem: AiImportItem = {
      temp_id: `manual-${Date.now()}`,
      book_code: newCode,
      title: '',
      author: 'Noma\'lum',
      category: 'Badiiy adabiyot',
      copies_count: 1,
      is_duplicate: false,
      duplicate_info: null,
      qr_data: `KITOBXON:${newCode}`,
      qr_preview: '',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Step 2: Confirm & Save to Database
  const handleConfirmSave = async () => {
    // Validation
    const emptyTitles = items.filter((i) => !i.title.trim());
    if (emptyTitles.length > 0) {
      setError(`Iltimos, barcha kitoblarning nomini to'ldiring (${emptyTitles.length} ta kitob nomi bo'sh)`);
      return;
    }

    setConfirmLoading(true);
    setError(null);

    try {
      const payload = {
        items: items.map((i) => ({
          book_code: i.book_code,
          title: i.title.trim(),
          author: (i.author || "Noma'lum").trim(),
          category: (i.category || "Badiiy adabiyot").trim(),
          copies_count: Math.max(1, parseInt(String(i.copies_count), 10) || 1),
        })),
      };

      const res = await fetch('/api/books/ai-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kitoblarni saqlashda xatolik yuz berdi");
      }

      setSuccessInfo({
        count: data.created_count || items.length,
        message: data.message || `${data.created_count} ta kitob muvaffaqiyatli saqlandi!`,
      });

      onSuccess(data.created_count || items.length);
    } catch (err: any) {
      console.error('AI Confirm xatosi:', err);
      setError(err.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setConfirmLoading(false);
    }
  };

  // Copy QR text to clipboard
  const handleCopyQr = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  const totalCopies = items.reduce((acc, i) => acc + (parseInt(String(i.copies_count), 10) || 1), 0);
  const duplicateCount = items.filter((i) => i.is_duplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-50/50 via-indigo-50/30 to-transparent dark:from-slate-800/50 dark:via-slate-850 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Aqlli Kitoblar Importeri</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  Gemini 3.8 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Excel, CSV, rasm yoki ro&apos;yxat jadvalini yuklang — AI ustunlarni avtomatik ajratib, QR kodlar bilan to&apos;ldiradi
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-xs font-semibold underline hover:opacity-80">
                Yopish
              </button>
            </div>
          )}

          {/* VIEW 1: UPLOAD FORM (when no preview items yet) */}
          {items.length === 0 && !successInfo && (
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 scale-[1.01]'
                    : file
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setError(null);
                    }
                  }}
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      file
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                        : 'bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400'
                    }`}
                  >
                    {file ? <FileSpreadsheet className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                  </div>

                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Hajmi: {(file.size / 1024).toFixed(1)} KB — Boshqa fayl tanlash uchun bosing
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Excel (.xlsx, .xls) yoki CSV jadval faylini bu yerga tashlang
                      </p>
                      <p className="text-xs text-slate-400">
                        yoki kompyuterdan tanlash uchun bosing (shuningdek PDF yoki kitob ro&apos;yxati rasmlari ham qo&apos;llab-quvvatlanadi)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Or Text Area Toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTextInput(!showTextInput)}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5 mx-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{showTextInput ? "Fayl yuklashga qaytish" : "Yoki matn/ro'yxatni nusxalab qo'yish"}</span>
                </button>
              </div>

              {showTextInput && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kitoblar ro&apos;yxati (matn yoki nusxalangan jadval qatorlari):
                  </label>
                  <textarea
                    rows={5}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`1. O'tkan kunlar, Abdulla Qodiriy, 3 nusxa, Badiiy\n2. Fizika 9-sinf darslik, S.Qodirov, 15 dona\n3. Dunyoning ishlari, O'tkir Hoshimov`}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              {/* Feature Highlights Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Aqlli Tahlil
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Ustunlar tartibi yoki sarlavhalari turlicha bo&apos;lsa ham AI nom, muallif va nusxani aniq ajratadi.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    Avto-Kod & QR
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Kutubxonadagi eng oxirgi raqamdan davom etib yangi unikal KTB-kodlar va skanerlash QR kodlari yaratiladi.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Dublikat Nazorati
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Bazada allaqachon mavjud bo&apos;lgan kitoblar sariq belgi bilan ko&apos;rsatilib, adashishning oldi olinadi.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || (!file && !textInput.trim())}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Gemini AI jadvalni tahlil qilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Tahlil qilish & Oldindan ko&apos;rish (AI Preview)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: PREVIEW & EDITING TABLE */}
          {items.length > 0 && !successInfo && (
            <div className="space-y-4">
              {/* Stats Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                    Jami kitob turlari: <span className="text-violet-600 dark:text-violet-400">{items.length} ta</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Jami nusxalar fondi: <span className="text-emerald-600 dark:text-emerald-400">{totalCopies} ta</span>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Bazada mavjud (dublikat): {duplicateCount} ta
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Qator qo&apos;shish</span>
                </button>
              </div>

              {/* Editable Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 text-left w-12">#</th>
                        <th className="px-3 py-3 text-left w-28">Kodi</th>
                        <th className="px-3 py-3 text-left min-w-[200px]">Kitob nomi</th>
                        <th className="px-3 py-3 text-left min-w-[140px]">Muallif</th>
                        <th className="px-3 py-3 text-left min-w-[150px]">Kategoriya</th>
                        <th className="px-3 py-3 text-center w-20">Nusxa</th>
                        <th className="px-3 py-3 text-center w-24">Holat</th>
                        <th className="px-3 py-3 text-center w-16">QR</th>
                        <th className="px-3 py-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                      {items.map((item, idx) => (
                        <tr
                          key={item.temp_id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            item.is_duplicate ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-400 text-center">
                            {idx + 1}
                          </td>

                          {/* Code */}
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={item.book_code}
                              onChange={(e) => handleUpdateItem(item.temp_id, 'book_code', e.target.value.toUpperCase())}
                              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100 text-xs uppercase"
                            />
                          </td>

                          {/* Title */}
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateItem(item.temp_id, 'title', e.target.value)}
                              placeholder="Kitob nomi..."
                              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                            />
                            {item.is_duplicate && item.duplicate_info && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>{item.duplicate_info}</span>
                              </div>
                            )}
                          </td>

                          {/* Author */}
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={item.author}
                              onChange={(e) => handleUpdateItem(item.temp_id, 'author', e.target.value)}
                              placeholder="Muallif..."
                              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                            />
                          </td>

                          {/* Category */}
                          <td className="px-3 py-2.5">
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateItem(item.temp_id, 'category', e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
                            >
                              {CATEGORY_OPTIONS.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Copies */}
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={item.copies_count}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.temp_id,
                                  'copies_count',
                                  Math.max(1, parseInt(e.target.value, 10) || 1)
                                )
                              }
                              className="w-16 px-2 py-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 text-xs"
                            />
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 text-center">
                            {item.is_duplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                                ⚠️ Dublikat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                                ✅ Yangi
                              </span>
                            )}
                          </td>

                          {/* QR preview button */}
                          <td className="px-3 py-2.5 text-center">
                            {item.qr_preview ? (
                              <button
                                type="button"
                                onClick={() => setQrModalItem(item)}
                                title="QR kodni ko'rish"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-colors"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* Delete row */}
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.temp_id)}
                              title="O'chirish"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  ⬅️ Boshqa fayl tanlash
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Jami <strong className="text-slate-800 dark:text-slate-200">{items.length}</strong> xil kitob (
                    <strong className="text-emerald-600 dark:text-emerald-400">{totalCopies} ta nusxa</strong>)
                  </span>

                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={confirmLoading || items.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {confirmLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Bazaga saqlanmoqda...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>✅ Tasdiqlash va Bazaga Saqlash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: SUCCESS CONFIRMATION */}
          {successInfo && (
            <div className="py-8 sm:py-12 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Kitoblar Muvaffaqiyatli Saqlandi!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {successInfo.message}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow transition-all"
                >
                  Yopish va Katalogda ko&apos;rish
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                >
                  Yana boshqa fayl import qilish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Inspection Modal */}
      {qrModalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Kitob QR Kodi
              </h3>
              <button
                onClick={() => setQrModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {qrModalItem.book_code}
              </p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                {qrModalItem.title}
              </p>
              <p className="text-[11px] text-slate-400">
                {qrModalItem.author} • {qrModalItem.category}
              </p>
            </div>

            {/* QR Image */}
            {qrModalItem.qr_preview && (
              <div className="p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner mx-auto">
                <img
                  src={qrModalItem.qr_preview}
                  alt={`QR for ${qrModalItem.book_code}`}
                  className="w-44 h-44 object-contain"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2">
              <a
                href={qrModalItem.qr_preview}
                download={`${qrModalItem.book_code}-qr.png`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Yuklab olish</span>
              </a>

              <button
                type="button"
                onClick={() => handleCopyQr(qrModalItem.qr_data)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedQr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQr ? "Nusxalandi!" : "Kodni nusxalash"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
