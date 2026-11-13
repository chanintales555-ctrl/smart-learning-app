'use client';

import { useEffect } from 'react';

export default function EnglishChapter2Page() {
  useEffect(() => {
    window.location.replace('/lessons/english/parts-of-speech/index.html');
  }, []);

  return (
    <div className="min-h-screen bg-[#030306] text-white flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-white">
          กำลังเปิดกระดานดำอัจฉริยะ · Parts of Speech...
        </h2>
        <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
          English Chapter 02 · หน้าที่ของคำ 8 ชนิด (Interactive Smartboard & Cloud Notes)
        </p>
      </div>
    </div>
  );
}
