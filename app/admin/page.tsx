'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export default function AdminQuizCreator() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: 'chemistry', 
    chapter: '1', 
    questionId: 'LOADING...', 
    questionText: '', 
    imageUrl: '', 
    optionA: '', optionB: '', optionC: '', optionD: '', optionE: '', 
    correct: 'A'
  });
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- 1. ระบบรัน Question ID อัตโนมัติ (ฉบับปรับปรุงใหม่) ---
  const fetchNextId = async (subject: string, chapter: string) => {
    try {
      const chapterNum = parseInt(chapter);
      // ดึงข้อสอบทั้งหมดในวิชาและบทนี้มานับ (วิธีนี้ชัวร์ที่สุดและไม่ต้องใช้ Index พิเศษ)
      const q = query(
        collection(db, 'quizzes'),
        where('subject', '==', subject),
        where('chapter', '==', chapterNum)
      );
      
      const querySnapshot = await getDocs(q);
      const subCode = subject.substring(0, 2).toUpperCase();
      const chCode = chapter.padStart(2, '0');

      if (querySnapshot.empty) {
        // ถ้ายังไม่มีข้อสอบเลย เริ่มที่ 01
        setFormData(prev => ({ ...prev, questionId: `${subCode}${chCode}-01` }));
      } else {
        // ถ้านับแล้วมีข้อมูล ให้เอาจำนวนที่มีอยู่มา + 1
        const count = querySnapshot.size;
        const nextNum = (count + 1).toString().padStart(2, '0');
        setFormData(prev => ({ ...prev, questionId: `${subCode}${chCode}-${nextNum}` }));
      }
    } catch (err) {
      console.error("Error fetching ID:", err);
      setFormData(prev => ({ ...prev, questionId: 'ERROR-FETCHING' }));
    }
  };

  // ดึง ID ใหม่ทันทีที่เปลี่ยนวิชาหรือบท
  useEffect(() => {
    fetchNextId(formData.subject, formData.chapter);
  }, [formData.subject, formData.chapter]);

  // --- 2. ระบบแปลงลิงก์ Google Drive อัตโนมัติ ---
  const convertDriveLink = (url: string) => {
    if (!url || !url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      // แปลงเป็นลิงก์ googleusercontent ทันที
      return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
    }
    return url;
  };

  const handleScan = async () => {
    if (!file) return alert('กรุณาเลือกรูปภาพก่อนครับ');
    setScanning(true);
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
      alert('AI สแกนสำเร็จ!');
    } catch (err) {
      alert('สแกนไม่สำเร็จ: ' + err);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.questionId.includes('LOADING')) return alert('กรุณารอระบบรัน ID สักครู่ครับ');
    
    setSaving(true);
    try {
      const finalImageUrl = convertDriveLink(formData.imageUrl);

      await addDoc(collection(db, "quizzes"), {
        ...formData,
        imageUrl: finalImageUrl,
        chapter: parseInt(formData.chapter),
        createdAt: serverTimestamp(),
      });

      alert(`บันทึกสำเร็จ! ข้อที่: ${formData.questionId}`);

      // ล้างข้อมูลโจทย์และช้อยส์เพื่อทำข้อต่อไป
      setFormData(prev => ({ 
        ...prev, 
        questionText: '', 
        imageUrl: '', 
        optionA: '', optionB: '', optionC: '', optionD: '', optionE: '' 
      }));

      // รัน ID ข้อถัดไปทันที
      fetchNextId(formData.subject, formData.chapter);

    } catch (err) {
      console.error(err);
      alert('บันทึกล้มเหลว: ' + err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050507] text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Section 1: Scanner */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] shadow-xl">
            <h2 className="text-xl font-black text-blue-500 mb-4 uppercase italic">1. AI Photo Scanner</h2>
            <div className="space-y-4">
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all" />
              <button onClick={handleScan} disabled={scanning || !file} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-30 transition-all shadow-lg shadow-blue-900/20">
                {scanning ? 'SCANNING...' : 'SCAN WITH GEMINI'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Data Entry */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white/5 border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-orange-500 mb-2 uppercase italic">2. Verify & Save</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Subject</label>
               <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 transition-all">
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
               </select>
             </div>
             
             <div className="space-y-2">
               <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Chapter</label>
               <input type="number" required value={formData.chapter} onChange={e => setFormData({...formData, chapter: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500" />
             </div>
             
             <div className="space-y-2">
               <label className="text-[10px] text-blue-400 uppercase font-black tracking-widest ml-1">Question ID (Auto)</label>
               <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl text-blue-400 font-mono font-bold text-center">
                 {formData.questionId}
               </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Question Content</label>
            <textarea placeholder="Type your question here... use [n] for enter" required rows={5} value={formData.questionText} onChange={e => setFormData({...formData, questionText: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-5 rounded-3xl outline-none focus:border-orange-500 text-lg transition-all" />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Google Drive Link</label>
            <input placeholder="https://drive.google.com/..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A','B','C','D','E'].map(opt => (
              <div key={opt} className="space-y-1">
                <label className="text-[8px] text-zinc-600 uppercase font-bold ml-2">Option {opt}</label>
                <input placeholder={`Answer ${opt}`} required value={(formData as any)[`option${opt}`] || ""} onChange={e => setFormData({...formData, [`option${opt}`]: e.target.value})} className="w-full bg-zinc-900 border border-white/10 p-3 rounded-xl outline-none focus:border-white/20" />
              </div>
            ))}
            
            <div className="md:col-span-2 flex gap-4 mt-6">
              <select value={formData.correct} onChange={e => setFormData({...formData, correct: e.target.value})} className="w-1/3 bg-green-500/10 border border-green-500/30 p-4 rounded-2xl text-green-500 font-bold outline-none">
                {['A','B','C','D','E'].map(o => <option key={o} value={o} className="bg-zinc-900">Key: {o}</option>)}
              </select>
              <button type="submit" disabled={saving || formData.questionId.includes('LOADING')} className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-red-900/20">
                {saving ? 'SAVING...' : 'SAVE QUESTION'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}