'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuizzesPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="z-10 text-center mb-16 space-y-4">
        <h1 className="text-6xl font-black italic tracking-tighter bg-gradient-to-r from-white via-gray-300 to-gray-600 bg-clip-text text-transparent uppercase">
          Select Subject
        </h1>
        <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-red-600 mx-auto rounded-full shadow-[0_0_20px_rgba(249,115,22,0.6)]"></div>
      </div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
        
        {/* Physics Card */}
        <button 
          onClick={() => router.push('/quizzes/physics')}
          className="group relative p-[1px] rounded-[3rem] overflow-hidden transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_0_50px_rgba(59,130,246,0.3)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-400 opacity-20 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-[#0d0d0f] rounded-[2.9rem] p-12 h-full border border-white/5 flex flex-col items-center text-center transition-colors duration-500 group-hover:bg-[#0d0d0f]/80">
            <div className="text-7xl mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">⚛️</div>
            <h2 className="text-4xl font-black italic tracking-tight text-blue-400 mb-4 uppercase drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Physics</h2>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest group-hover:text-blue-100 transition-colors">กลศาสตร์ · คลื่น · ไฟฟ้า</p>
          </div>
        </button>

        {/* Chemistry Card */}
        <button 
          onClick={() => router.push('/quizzes/chemistry')}
          className="group relative p-[1px] rounded-[3rem] overflow-hidden transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_0_50px_rgba(249,115,22,0.3)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-500 opacity-20 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-[#0d0d0f] rounded-[2.9rem] p-12 h-full border border-white/5 flex flex-col items-center text-center transition-colors duration-500 group-hover:bg-[#0d0d0f]/80">
            <div className="text-7xl mb-6 transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">🧪</div>
            <h2 className="text-4xl font-black italic tracking-tight text-orange-500 mb-4 uppercase drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">Chemistry</h2>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest group-hover:text-orange-100 transition-colors">อะตอม · พันธะ · ปฏิกิริยา</p>
          </div>
        </button>
      </div>

      <Link href="/" className="z-10 mt-16 text-gray-600 hover:text-white transition-all text-xs font-black uppercase tracking-[0.4em] hover:tracking-[0.6em]">
        ← Back to Dashboard
      </Link>
    </main>
  );
}