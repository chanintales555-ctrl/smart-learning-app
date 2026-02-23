'use client';
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  if (session) {
    return (
      <main className="h-screen w-full bg-[#0d0d0f] text-white overflow-hidden relative flex flex-col">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 blur-[150px] rounded-full animate-pulse pointer-events-none"></div>

        <header className="absolute top-0 left-0 w-full p-8 z-50 pointer-events-none">
          {/* ฝั่งซ้าย: Logo */}
          <div className="absolute top-8 left-10 flex items-center gap-4 pointer-events-auto">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="NJ Logo" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic leading-none">NJ TUTOR</span>
              <span className="text-[10px] text-orange-500 tracking-[0.4em] font-bold uppercase opacity-50">Academy</span>
            </div>
          </div>

          {/* ฝั่งขวา: Menu & User */}
          <div className="absolute top-8 right-10 flex items-center gap-4 pointer-events-auto">
            <nav className="flex gap-2 items-center">
              <button className="group relative px-5 py-2 rounded-xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white/5 rounded-xl group-hover:bg-orange-500/10 transition-all border border-white/5 group-hover:border-orange-500/20"></div>
                <span className="relative text-sm font-bold text-gray-400 group-hover:text-orange-400 transition-colors">Courses</span>
              </button>
              
              {/* ปุ่ม Quizzes ที่กดได้จริง */}
              <Link href="/quizzes" className="group relative px-5 py-2 rounded-xl transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-white/5 rounded-xl group-hover:bg-orange-500/10 transition-all border border-white/5 group-hover:border-orange-500/20"></div>
                <span className="relative text-sm font-bold text-gray-400 group-hover:text-orange-400 transition-colors">Quizzes</span>
              </Link>
            </nav>

            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-5 py-2 rounded-2xl border border-white/5 shadow-2xl">
              <div className="text-right leading-none">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Active</p>
                <p className="text-sm font-bold text-orange-100">{session?.user?.name}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center font-black text-white shadow-lg border border-white/10">
                {session?.user?.name?.charAt(0).toUpperCase()}
              </div>
              <button onClick={() => signOut()} className="text-[10px] font-black text-red-500/70 hover:text-red-500 transition-colors uppercase tracking-widest pl-2 border-l border-white/10">
                Exit
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto px-10 gap-20 w-full pt-10">
          <div className="flex-1 space-y-8 z-10">
            <h1 className="text-3xl md:text-5xl font-serif italic leading-tight text-orange-400 drop-shadow-2xl">
              “I have learned more from my <br />
              <span className="text-white not-italic font-sans font-black tracking-tighter uppercase text-4xl md:text-6xl">mistakes</span> <br />
              than from my successes”
            </h1>
          </div>
          <div className="flex-1 flex justify-center items-center relative py-10">
            <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full animate-pulse"></div>
            <div className="relative group w-full max-w-[360px] aspect-[4/5]">
              <div className="relative h-full bg-[#0d0d0f] rounded-[3rem] p-1.5 border border-white/10 overflow-hidden shadow-2xl shadow-orange-500/20">
                <img src="/sir.jpg" alt="Sir Humphry Davy" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000" />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-[#0a0a0c] flex items-center justify-center text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="z-10 text-center space-y-12 px-6">
        <div className="flex flex-col items-center gap-6">
          <img src="/logo.png" alt="NJ Logo" className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_30px_rgba(249,115,22,0.5)]" />
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-700 bg-clip-text text-transparent italic leading-none">NJ TUTOR</h1>
        </div>
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <Link href="/login" className="px-20 py-5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl font-black tracking-widest hover:scale-105 transition-all">SIGN IN</Link>
          <Link href="/register" className="px-20 py-5 border border-white/10 rounded-2xl font-black tracking-widest text-gray-400 hover:bg-white/5 transition-all">REGISTER</Link>
        </div>
      </div>
    </main>
  );
}