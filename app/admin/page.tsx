'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

// --- Icons (Inline SVG) ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
);

const ImageIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
);

const SaveIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

const ScanIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="12" y1="7" x2="12" y2="17"/></svg>
);

const ListIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);

export default function AdminScanner() {
  const [formData, setFormData] = useState({
    subject: 'physics',
    chapter: '1',
    questionId: 'LOADING...',
    questionText: '',
    imageUrl: '',
    optionA: '', optionB: '', optionC: '', optionD: '', optionE: '',
    correct: 'A'
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);

  // --- 1. ระบบรัน Question ID อัตโนมัติ (แก้ไขเพื่อเลี่ยง Error Index) ---
  const fetchNextId = async (subject: string, chapter: string) => {
    try {
      const chapterNum = parseInt(chapter);
      // ใช้ simple query ดึงมาทั้งหมดก่อนแล้วคัดกรองใน JS memory
      const querySnapshot = await getDocs(collection(db, 'quizzes'));
      
      const filteredDocs = querySnapshot.docs
        .map(doc => doc.data())
        .filter(data => data.subject === subject && data.chapter === chapterNum);
      
      const subCode = subject.substring(0, 2).toUpperCase();
      const chCode = chapter.padStart(2, '0');

      if (filteredDocs.length === 0) {
        setFormData(prev => ({ ...prev, questionId: `${subCode}${chCode}-01` }));
      } else {
        const count = filteredDocs.length;
        const nextNum = (count + 1).toString().padStart(2, '0');
        setFormData(prev => ({ ...prev, questionId: `${subCode}${chCode}-${nextNum}` }));
      }
    } catch (err) {
      console.error("Error fetching ID:", err);
      setFormData(prev => ({ ...prev, questionId: 'ERROR' }));
    }
  };

  // ดึงรายการโจทย์ล่าสุดมาโชว์ทางฝั่งขวา (แก้ไขเพื่อเลี่ยง Error Index)
  const fetchRecent = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quizzes"));
      const subject = formData.subject;
      const chapterNum = parseInt(formData.chapter.toString());

      const items = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(data => data.subject === subject && data.chapter === chapterNum)
        .sort((a, b) => (b.questionId || "").localeCompare(a.questionId || "")); // เรียงจากมากไปน้อย

      setRecentQuizzes(items);
    } catch (error) {
      console.error("Error fetching recent quizzes:", error);
    }
  };

  useEffect(() => {
    fetchNextId(formData.subject, formData.chapter.toString());
    fetchRecent();
  }, [formData.subject, formData.chapter]);

  // --- 2. ระบบแปลงลิงก์ Google Drive อัตโนมัติ ---
  const convertDriveLink = (url: string) => {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
    }
    return url;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'chapter' ? (value === '' ? '' : parseInt(value)) : value
    }));
  };

  // --- 3. ระบบ AI Scan ---
  const handleScan = async () => {
    if (!file) return setMessage({ type: 'error', text: 'กรุณาเลือกรูปภาพก่อนครับ' });
    setScanning(true);
    setMessage({ type: '', text: '' });
    
    const data = new FormData();
    data.append('image', file);

    try {
      const res = await fetch('/api/admin/scan-quiz', { method: 'POST', body: data });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setFormData(prev => ({
        ...prev,
        questionText: result.questionText || '',
        optionA: result.optionA || '', 
        optionB: result.optionB || '',
        optionC: result.optionC || '', 
        optionD: result.optionD || '',
        optionE: result.optionE || '', 
        correct: result.correct || 'A'
      }));
      setMessage({ type: 'success', text: 'AI สแกนสำเร็จ!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'สแกนไม่สำเร็จ: ' + err.message });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.questionId.includes('LOADING')) return setMessage({ type: 'error', text: 'กรุณารอระบบรัน ID สักครู่ครับ' });
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const finalImageUrl = convertDriveLink(formData.imageUrl);

      await addDoc(collection(db, "quizzes"), {
        ...formData,
        imageUrl: finalImageUrl,
        chapter: parseInt(formData.chapter.toString()),
        createdAt: serverTimestamp(),
      });

      setMessage({ type: 'success', text: `บันทึกสำเร็จ! ข้อที่: ${formData.questionId}` });
      
      // เคลียร์ฟอร์ม
      setFormData(prev => ({
        ...prev,
        questionText: '',
        imageUrl: '',
        optionA: '', optionB: '', optionC: '', optionD: '', optionE: ''
      }));
      
      fetchNextId(formData.subject, formData.chapter.toString());
      fetchRecent();
    } catch (error: any) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Scanner */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-500">
              <PlusIcon />
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Quiz <span className="text-blue-500">Scanner & Creator</span></h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            
            {/* AI Scanner Section */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-xl">
              <h2 className="text-lg font-black text-blue-500 mb-6 uppercase italic flex items-center gap-2">
                <ScanIcon size={18}/> 1. AI Photo Scanner
              </h2>
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  className="block w-full text-xs text-zinc-400 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 transition-all cursor-pointer" 
                />
                <button 
                  onClick={handleScan} 
                  disabled={scanning || !file} 
                  className="px-8 py-3 bg-blue-600 rounded-full font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-30 transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap"
                >
                  {scanning ? 'SCANNING...' : 'SCAN WITH AI'}
                </button>
              </div>
            </div>

            {/* Data Entry Form */}
            <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-white/5 p-8 md:p-10 rounded-[3rem] shadow-2xl space-y-6">
              <h2 className="text-lg font-black text-orange-500 mb-2 uppercase italic flex items-center gap-2">
                <SaveIcon size={18}/> 2. Verify & Save
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">Subject</label>
                  <select name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all">
                    <option value="physics">PHYSICS</option>
                    <option value="chemistry">CHEMISTRY</option>
                    <option value="biology">BIOLOGY</option>
                    <option value="math">MATH</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">Chapter</label>
                  <input type="number" name="chapter" value={formData.chapter} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-blue-500 mb-2 block">Question ID (Auto)</label>
                  <div className="w-full bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl font-mono font-bold text-blue-500 text-center">
                    {formData.questionId}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">Question Image URL (Support Drive)</label>
                <div className="relative">
                  <input name="imageUrl" placeholder="Paste link here..." value={formData.imageUrl} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 pl-12 rounded-2xl focus:border-blue-500 outline-none transition-all" />
                  <div className="absolute left-4 top-4 text-zinc-600">
                    <ImageIcon size={20} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 block">Question Text ([n] for enter)</label>
                <textarea name="questionText" rows={4} value={formData.questionText} onChange={handleChange} className="w-full bg-black border border-white/10 p-4 rounded-3xl focus:border-blue-500 outline-none transition-all" placeholder="พิมพ์โจทย์ที่นี่..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                  <div key={opt} className="flex items-center gap-3">
                     <span className="w-8 font-black text-zinc-600">{opt}</span>
                     <input 
                      name={`option${opt}`} 
                      placeholder={`ตัวเลือก ${opt}`} 
                      value={(formData as any)[`option${opt}`]} 
                      onChange={handleChange} 
                      className="flex-1 bg-black border border-white/10 p-3 rounded-xl focus:border-zinc-500 outline-none transition-all text-sm" 
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-4">
                <select name="correct" value={formData.correct} onChange={handleChange} className="bg-green-500/10 border border-green-500/30 p-4 rounded-2xl text-green-500 font-bold outline-none md:w-1/3">
                  {['A', 'B', 'C', 'D', 'E'].map(opt => <option key={opt} value={opt} className="bg-black">KEY: {opt}</option>)}
                </select>
                <button type="submit" disabled={loading || formData.questionId.includes('LOADING')} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black italic uppercase py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20">
                  {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><SaveIcon size={20}/> SAVE TO CLOUD</>}
                </button>
              </div>

              {message.text && (
                <div className={`p-4 rounded-xl text-center font-bold text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {message.text}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Previews */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Image Preview */}
          <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem]">
             <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
               <ImageIcon size={14}/> Image Preview
             </h3>
             <div className="aspect-video bg-black rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
               {formData.imageUrl ? (
                 <img 
                    src={convertDriveLink(formData.imageUrl)} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain" 
                    onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400x225?text=Invalid+Image+Link")}
                  />
               ) : (
                 <span className="text-zinc-700 italic text-sm">Waiting for image URL...</span>
               )}
             </div>
          </div>

          {/* Recent List */}
          <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem]">
            <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
               <ListIcon size={14}/> Recent in {formData.subject.toUpperCase()} Ch.{formData.chapter}
             </h3>
             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {recentQuizzes.length > 0 ? recentQuizzes.map((q) => (
                  <div key={q.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-blue-500 text-xs">{q.questionId}</span>
                      <p className="text-[11px] text-zinc-400 max-w-[150px] leading-relaxed whitespace-pre-line">
                        {q.questionText?.replace(/\[n\]/g, '\n') || "(No Text Content)"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold bg-green-500/20 text-green-500 px-2 py-1 rounded"> KEY: {q.correct}</span>
                      {q.imageUrl && <span className="text-[8px] text-zinc-600">JPG</span>}
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-zinc-600 py-10 italic text-xs">No questions found in this chapter.</p>
                )}
             </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </div>
  );
}