'use client';

import { useEffect } from 'react';

export default function Chapter10Page() {
  useEffect(() => {
    window.location.replace('/lessons/chemistry/acid-base/index.html');
  }, []);

  return (
    <div className="min-h-screen bg-[#030306] text-white flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-white">
          กำลังเปิดกระดานอัจฉริยะ & ห้องแล็บ 3D กรด-เบส...
        </h2>
        <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
          Chapter 10 · กรด-เบส (Interactive Smartboard & Cloud Notes)
        </p>
      </div>
    </div>
  );
}
