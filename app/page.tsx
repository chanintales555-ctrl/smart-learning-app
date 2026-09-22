'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Lenis from 'lenis';
import { 
  Atom, 
  FlaskConical, 
  Sparkles, 
  ChevronDown, 
  ArrowRight, 
  BookOpen, 
  GraduationCap, 
  LogOut,
  Layers,
  CheckCircle2,
  Cpu
} from 'lucide-react';

const CosmicCanvas = dynamic(() => import('@/components/canvas/CosmicCanvas'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#030306]" />,
});

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isWarping, setIsWarping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWarpToChemistry = () => {
    setIsWarping(true);
    setTimeout(() => {
      router.push('/course/chemistry');
    }, 650);
  };

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const progress = Math.min(1, Math.max(0, window.scrollY / totalScroll));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, []);

  const scrollToSection = (progressTarget: number) => {
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: totalScroll * progressTarget,
      behavior: 'smooth',
    });
  };

  const currentStage = 
    scrollProgress < 0.25 ? 1 :
    scrollProgress < 0.55 ? 2 :
    scrollProgress < 0.85 ? 3 : 4;

  return (
    <div ref={containerRef} className="relative bg-[#030306] text-white min-h-[400vh] selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* 3D WebGL Background Scene */}
      <CosmicCanvas scrollProgress={scrollProgress} isWarping={isWarping} />

      {/* Cinematic Hyperspace Warp Overlay */}
      <div
        className={`fixed inset-0 z-50 pointer-events-none transition-all duration-700 ease-in flex items-center justify-center ${
          isWarping 
            ? 'opacity-100 bg-emerald-950/20 backdrop-blur-xl scale-105' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className={`w-96 h-96 rounded-full bg-emerald-400/30 blur-[120px] transition-all duration-700 ${
          isWarping ? 'scale-[8] opacity-100' : 'scale-0 opacity-0'
        }`} />
        <div className="relative text-center space-y-3 animate-pulse">
          <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.4em] text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]">
            WARPING TO CHEMISTRY CURRICULUM
          </span>
          <div className="w-56 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto" />
        </div>
      </div>

      {/* Top Hairline Progress */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-white/[0.06]">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.7)] transition-all duration-75"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Minimalist Floating Island Header */}
      <header className="fixed top-6 left-0 w-full px-6 md:px-14 z-50 flex items-center justify-between pointer-events-none">
        {/* Brand Logo & Name */}
        <Link href="/" className="pointer-events-auto flex items-center gap-3.5 group">
          <div className="w-12 h-12 relative flex items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.12] backdrop-blur-2xl group-hover:border-white/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <img 
              src="/logo.png" 
              alt="NJ Logo" 
              className="w-7 h-7 object-contain drop-shadow-[0_0_12px_rgba(249,115,22,0.5)] group-hover:scale-105 transition-transform" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white/95 leading-none">
              NJ TUTOR
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.28em] text-white/45 mt-1">
              Academy
            </span>
          </div>
        </Link>

        {/* Navigation & Controls */}
        <div className="pointer-events-auto flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-1.5 bg-black/50 backdrop-blur-3xl px-4 py-2 rounded-full border border-white/[0.1] shadow-2xl">
            <Link 
              href="/quizzes" 
              className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white rounded-full hover:bg-white/[0.08] transition-all"
            >
              Quizzes
            </Link>
            <Link 
              href="/course" 
              className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white rounded-full hover:bg-white/[0.08] transition-all"
            >
              Courses
            </Link>
            <Link 
              href="/admin" 
              className="px-4 py-2 text-sm font-semibold text-white/50 hover:text-white/90 rounded-full hover:bg-white/[0.05] transition-all"
            >
              Admin
            </Link>
          </nav>

          {/* User Session Status */}
          {session ? (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-3xl pl-4 pr-2.5 py-2 rounded-full border border-white/[0.1]">
              <span className="text-sm font-semibold text-white/90 max-w-[120px] truncate">
                {session.user?.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/[0.12] border border-white/20 flex items-center justify-center font-bold text-sm text-white">
                {session.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button 
                onClick={() => signOut()}
                className="text-white/40 hover:text-red-400 p-1.5 transition-colors ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link 
                href="/login" 
                className="px-5 py-2.5 text-sm font-semibold text-white/90 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-xl rounded-full border border-white/[0.12] transition-all"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="hidden sm:inline-flex px-6 py-2.5 text-sm font-bold text-black bg-white hover:bg-neutral-200 rounded-full transition-all shadow-[0_0_24px_rgba(255,255,255,0.25)] hover:scale-[1.02]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Sleek Minimal Telemetry Indicator (Right Edge) */}
      <div className="fixed right-10 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-6 pointer-events-none">
        {[
          { num: '01', title: 'ORBIT' },
          { num: '02', title: 'QUANTUM' },
          { num: '03', title: 'MOLECULE' },
          { num: '04', title: 'NEXUS' },
        ].map((item, idx) => {
          const isActive = currentStage === idx + 1;
          return (
            <div key={item.num} className="flex items-center gap-3.5">
              <span className={`text-xs font-mono tracking-widest transition-all duration-300 ${
                isActive ? 'text-white font-bold opacity-100' : 'text-white/25 opacity-40'
              }`}>
                {item.title}
              </span>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive ? 'bg-cyan-400 scale-125 shadow-[0_0_10px_rgba(56,189,248,0.9)]' : 'bg-white/20'
              }`} />
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO LAUNCHPAD (Scroll 0% - 25%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in zoom-in duration-1000">
          {/* Subtle Pill Tag */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] backdrop-blur-xl text-white/80 text-sm font-mono tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>OPEN ACADEMY · 100% FREE LEARNING</span>
          </div>

          {/* Main Title */}
          <div className="space-y-6">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none text-white drop-shadow-2xl">
              COSMIC ODYSSEY
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl font-light text-white/70 tracking-wide max-w-2xl mx-auto leading-relaxed">
              “I have learned more from my mistakes than from my successes”
            </p>
            <p className="text-xs sm:text-sm text-white/40 font-mono uppercase tracking-[0.24em]">
              Sir Humphry Davy · Pioneer of Chemistry & Physics
            </p>
          </div>

          {/* Action CTAs (Larger Buttons) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => scrollToSection(0.38)}
              className="w-full sm:w-auto px-10 py-4.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-base sm:text-lg tracking-wider uppercase transition-all hover:scale-[1.03] shadow-[0_0_35px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>Explore Curriculum</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <Link
              href="/quizzes"
              className="w-full sm:w-auto px-10 py-4.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.15] text-white font-semibold text-base sm:text-lg tracking-wider uppercase backdrop-blur-xl transition-all hover:scale-[1.03] flex items-center justify-center gap-3"
            >
              <GraduationCap className="w-5 h-5 text-white/70" />
              <span>All Quizzes</span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 text-white/40 hover:text-white/80 transition-colors">
          <span className="text-xs font-mono uppercase tracking-[0.3em]">Scroll to travel</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: 🪐 PHYSICS REALM (Scroll 25% - 55%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex items-center justify-start px-6 md:px-24 relative z-10">
        <div className="max-w-xl md:max-w-2xl bg-black/40 backdrop-blur-3xl border border-white/[0.1] p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.7)] relative group hover:border-white/[0.2] transition-all duration-500">
          <div className="space-y-7 relative z-10">
            {/* Header Telemetry Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-500/[0.1] border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-mono tracking-wider uppercase">
              <Atom className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span>01 // QUANTUM SINGULARITY</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white">
                PHYSICS <span className="text-white/30 font-light">A-LEVEL</span>
              </h2>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                ทำความเข้าใจกลศาสตร์ คลื่น แสง เสียง ตลอดจนฟิสิกส์นิวเคลียร์และอนุภาค ผ่านบทเรียนและคลังข้อสอบเข้มข้น ออกแบบตามมาตรฐาน A-Level ล่าสุด
              </p>
            </div>

            {/* Premium Metrics Cards */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white/95">19 Core Modules</h4>
                  <p className="text-xs sm:text-sm text-white/50">กลศาสตร์ · คลื่น · ไฟฟ้า · นิวเคลียร์</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white/95">Timed Practice Quizzes</h4>
                  <p className="text-xs sm:text-sm text-white/50">ระบบจำลองสอบจริง พร้อมเฉลยละเอียด</p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Larger) */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
              <Link
                href="/quizzes/physics"
                className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 hover:scale-[1.02] shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                <span>Take Physics Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/course"
                className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-white/80 hover:text-white font-semibold text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center"
              >
                All Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 🧪 CHEMISTRY REALM (Scroll 55% - 85%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex items-center justify-end px-6 md:px-24 relative z-10">
        <div className="max-w-xl md:max-w-2xl bg-black/40 backdrop-blur-3xl border border-white/[0.1] p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.7)] relative group hover:border-white/[0.2] transition-all duration-500">
          <div className="space-y-7 relative z-10">
            {/* Header Telemetry Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/[0.1] border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-mono tracking-wider uppercase">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <span>02 // MOLECULAR DYNAMICS</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white">
                CHEMISTRY <span className="text-white/30 font-light">A-LEVEL</span>
              </h2>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                เจาะลึกโครงสร้างอะตอม พันธะเคมี ปริมาณสัมพันธ์ และเคมีอินทรีย์ ด้วยการวิเคราะห์โจทย์เชิงลึกและเทคนิคการจำที่แม่นยำ
              </p>
            </div>

            {/* Premium Metrics Cards */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white/95">13 Structured Chapters</h4>
                  <p className="text-xs sm:text-sm text-white/50">อะตอม · พันธะ · ปริมาณสัมพันธ์ · เคมีอินทรีย์</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white/95">Automated Analytics</h4>
                  <p className="text-xs sm:text-sm text-white/50">บันทึกสถิติคะแนนและจุดบกพร่องรายบุคคล</p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Dual Track: Course Lessons with Warp & Quizzes) */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
              <button
                onClick={handleWarpToChemistry}
                className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 hover:scale-[1.03] shadow-[0_0_30px_rgba(52,211,153,0.4)] cursor-pointer"
              >
                <FlaskConical className="w-4 h-4" />
                <span>เข้าสู่บทเรียน (เนื้อหา 13 บท)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/quizzes/chemistry"
                className="w-full sm:w-auto px-8 py-4.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 hover:scale-[1.02] shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                <span>ทำ Chemistry Quiz</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: 🌌 MISSION CONTROL / NEXUS (Scroll 85% - 100%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs sm:text-sm font-mono tracking-wider uppercase text-white/60">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>03 // ACADEMY NEXUS</span>
            </div>
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white">
              SELECT YOUR TRACK
            </h2>
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto">
              เริ่มต้นฝึกฝนเพื่อเป้าหมายของคุณ เรียนฟรี 100% ไม่มีข้อผูกมัดใดๆ
            </p>
          </div>

          {/* Clean Glass Cards Grid (Larger Typography & Padding) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* Physics Card */}
            <Link
              href="/quizzes/physics"
              className="p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/[0.1] hover:border-cyan-500/50 transition-all hover:-translate-y-1.5 group text-left space-y-4 shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/[0.1] border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Atom className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Physics A-Level
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                แบบทดสอบ 19 บทเรียน พร้อมคำนวณและเฉลยโจทย์ข้อสอบเก่า
              </p>
            </Link>

            {/* Chemistry Card */}
            <div
              className="p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/[0.1] hover:border-emerald-500/50 transition-all hover:-translate-y-1.5 group text-left space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/[0.1] border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  Chemistry A-Level
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  เนื้อหา 13 บทเรียนและแบบทดสอบเจาะลึก ครอบคลุมปฏิกิริยาเคมีและสารอินทรีย์
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleWarpToChemistry}
                  className="px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                >
                  <span>บทเรียน 3D</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  href="/quizzes/chemistry"
                  className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white font-semibold text-xs uppercase tracking-wider transition-all"
                >
                  Quizzes
                </Link>
              </div>
            </div>

            {/* Course Hub Card */}
            <Link
              href="/course"
              className="p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/[0.1] hover:border-white/35 transition-all hover:-translate-y-1.5 group text-left space-y-4 sm:col-span-2 md:col-span-1 shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-white/85 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-white transition-colors">
                All Curriculum
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                ภาพรวมวิชาทั้งหมด ฟิสิกส์ เคมี ชีววิทยา และคณิตศาสตร์
              </p>
            </Link>
          </div>

          {/* Minimal Clean Footer */}
          <div className="pt-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm font-mono text-white/40 gap-4">
            <span>© NJ TUTOR ACADEMY · OPEN LEARNING</span>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => scrollToSection(0)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                ↑ Top
              </button>
              <Link href="/admin" className="hover:text-white transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}