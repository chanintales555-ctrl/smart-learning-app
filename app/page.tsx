'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
  const { data: session } = useSession();
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Determine current active stage
  const currentStage = 
    scrollProgress < 0.25 ? 1 :
    scrollProgress < 0.55 ? 2 :
    scrollProgress < 0.85 ? 3 : 4;

  return (
    <div ref={containerRef} className="relative bg-[#030306] text-white min-h-[400vh] selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* 3D WebGL Background Scene */}
      <CosmicCanvas scrollProgress={scrollProgress} />

      {/* Top Hairline Progress */}
      <div className="fixed top-0 left-0 w-full h-[1px] z-50 bg-white/[0.06]">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-all duration-75"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Minimalist Floating Island Header */}
      <header className="fixed top-5 left-0 w-full px-6 md:px-12 z-50 flex items-center justify-between pointer-events-none">
        {/* Brand Logo & Monogram */}
        <Link href="/" className="pointer-events-auto flex items-center gap-3 group">
          <div className="w-10 h-10 relative flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.1] backdrop-blur-2xl group-hover:border-white/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <img 
              src="/logo.png" 
              alt="NJ Logo" 
              className="w-6 h-6 object-contain drop-shadow-[0_0_12px_rgba(249,115,22,0.5)] group-hover:scale-105 transition-transform" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-white/95 leading-none">
              NJ TUTOR
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[0.28em] text-white/40 mt-0.5">
              Academy
            </span>
          </div>
        </Link>

        {/* Minimal Navigation Pill */}
        <div className="pointer-events-auto flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-1 bg-black/40 backdrop-blur-3xl px-3 py-1.5 rounded-full border border-white/[0.08] shadow-2xl">
            <Link 
              href="/quizzes" 
              className="px-3.5 py-1.5 text-xs font-medium text-white/70 hover:text-white rounded-full hover:bg-white/[0.06] transition-all"
            >
              Quizzes
            </Link>
            <Link 
              href="/course" 
              className="px-3.5 py-1.5 text-xs font-medium text-white/70 hover:text-white rounded-full hover:bg-white/[0.06] transition-all"
            >
              Courses
            </Link>
            <Link 
              href="/admin" 
              className="px-3.5 py-1.5 text-xs font-medium text-white/40 hover:text-white/80 rounded-full hover:bg-white/[0.04] transition-all"
            >
              Admin
            </Link>
          </nav>

          {/* User Session Status */}
          {session ? (
            <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-3xl pl-3.5 pr-2 py-1.5 rounded-full border border-white/[0.08]">
              <span className="text-xs font-medium text-white/80 max-w-[100px] truncate">
                {session.user?.name}
              </span>
              <div className="w-7 h-7 rounded-full bg-white/[0.1] border border-white/20 flex items-center justify-center font-bold text-xs text-white">
                {session.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button 
                onClick={() => signOut()}
                className="text-white/40 hover:text-red-400 p-1 transition-colors ml-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                href="/login" 
                className="px-4 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl rounded-full border border-white/[0.1] transition-all"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="hidden sm:inline-flex px-4 py-1.5 text-xs font-medium text-black bg-white hover:bg-neutral-200 rounded-full transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Sleek Minimal Telemetry Indicator (Right Edge) */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-5 pointer-events-none">
        {[
          { num: '01', title: 'ORBIT' },
          { num: '02', title: 'QUANTUM' },
          { num: '03', title: 'MOLECULE' },
          { num: '04', title: 'NEXUS' },
        ].map((item, idx) => {
          const isActive = currentStage === idx + 1;
          return (
            <div key={item.num} className="flex items-center gap-3">
              <span className={`text-[10px] font-mono tracking-widest transition-all duration-300 ${
                isActive ? 'text-white/90 font-bold opacity-100' : 'text-white/20 opacity-40'
              }`}>
                {item.title}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isActive ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-white/20'
              }`} />
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO LAUNCHPAD (Scroll 0% - 25%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
          {/* Subtle Pill Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-white/70 text-xs font-mono tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>OPEN ACADEMY · 100% FREE LEARNING</span>
          </div>

          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none text-white/95 drop-shadow-2xl">
              COSMIC ODYSSEY
            </h1>
            <p className="text-base sm:text-lg font-light text-white/60 tracking-wide max-w-xl mx-auto leading-relaxed">
              “I have learned more from my mistakes than from my successes”
            </p>
            <p className="text-[11px] text-white/30 font-mono uppercase tracking-[0.2em]">
              Sir Humphry Davy · Pioneer of Chemistry & Physics
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => scrollToSection(0.38)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold text-xs tracking-wider uppercase transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Curriculum</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/quizzes"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white/80 hover:text-white font-medium text-xs tracking-wider uppercase backdrop-blur-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-white/60" />
              <span>All Quizzes</span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors">
          <span className="text-[9px] font-mono uppercase tracking-[0.3em]">Scroll to travel</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: 🪐 PHYSICS REALM (Scroll 25% - 55%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex items-center justify-start px-6 md:px-24 relative z-10">
        <div className="max-w-lg bg-black/30 backdrop-blur-3xl border border-white/[0.08] p-8 md:p-10 rounded-[2rem] shadow-[0_16px_64px_rgba(0,0,0,0.6)] relative group hover:border-white/[0.15] transition-all duration-500">
          <div className="space-y-6 relative z-10">
            {/* Header Telemetry Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/[0.08] border border-cyan-500/20 text-cyan-400 text-[11px] font-mono tracking-wider uppercase">
              <Atom className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span>01 // QUANTUM SINGULARITY</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2.5">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                PHYSICS <span className="text-white/30 font-light">A-LEVEL</span>
              </h2>
              <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                ทำความเข้าใจกลศาสตร์ คลื่น แสง เสียง ตลอดจนฟิสิกส์นิวเคลียร์และอนุภาค ผ่านบทเรียนและคลังข้อสอบเข้มข้น ออกแบบตามมาตรฐาน A-Level ล่าสุด
              </p>
            </div>

            {/* Premium Metrics (Replaced Cluttered Grid) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/90">19 Core Modules</h4>
                  <p className="text-[11px] text-white/40">กลศาสตร์ · คลื่น · ไฟฟ้า · นิวเคลียร์</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/90">Timed Practice Quizzes</h4>
                  <p className="text-[11px] text-white/40">ระบบจำลองสอบจริง พร้อมเฉลยละเอียด</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/quizzes/physics"
                className="px-5 py-3 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold text-xs tracking-wider uppercase transition-all flex items-center gap-2"
              >
                <span>Take Physics Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/course"
                className="px-5 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white/70 hover:text-white font-medium text-xs tracking-wider uppercase transition-all"
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
        <div className="max-w-lg bg-black/30 backdrop-blur-3xl border border-white/[0.08] p-8 md:p-10 rounded-[2rem] shadow-[0_16px_64px_rgba(0,0,0,0.6)] relative group hover:border-white/[0.15] transition-all duration-500">
          <div className="space-y-6 relative z-10">
            {/* Header Telemetry Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-[11px] font-mono tracking-wider uppercase">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              <span>02 // MOLECULAR DYNAMICS</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2.5">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                CHEMISTRY <span className="text-white/30 font-light">A-LEVEL</span>
              </h2>
              <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                เจาะลึกโครงสร้างอะตอม พันธะเคมี ปริมาณสัมพันธ์ และเคมีอินทรีย์ ด้วยการวิเคราะห์โจทย์เชิงลึกและเทคนิคการจำที่แม่นยำ
              </p>
            </div>

            {/* Premium Metrics (Replaced Cluttered Grid) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/90">13 Structured Chapters</h4>
                  <p className="text-[11px] text-white/40">อะตอม · พันธะ · ปริมาณสัมพันธ์ · เคมีอินทรีย์</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white/90">Automated Analytics</h4>
                  <p className="text-[11px] text-white/40">บันทึกสถิติคะแนนและจุดบกพร่องรายบุคคล</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/quizzes/chemistry"
                className="px-5 py-3 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold text-xs tracking-wider uppercase transition-all flex items-center gap-2"
              >
                <span>Take Chemistry Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/course"
                className="px-5 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white/70 hover:text-white font-medium text-xs tracking-wider uppercase transition-all"
              >
                All Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: 🌌 MISSION CONTROL / NEXUS (Scroll 85% - 100%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono tracking-wider uppercase text-white/50">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>03 // ACADEMY NEXUS</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
              SELECT YOUR TRACK
            </h2>
            <p className="text-white/50 text-xs sm:text-sm max-w-lg mx-auto">
              เริ่มต้นฝึกฝนเพื่อเป้าหมายของคุณ เรียนฟรี 100% ไม่มีข้อผูกมัดใดๆ
            </p>
          </div>

          {/* Clean Glass Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Physics Card */}
            <Link
              href="/quizzes/physics"
              className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/[0.08] hover:border-cyan-500/40 transition-all hover:-translate-y-1 group text-left space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Atom className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Physics A-Level
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                แบบทดสอบ 19 บทเรียน พร้อมคำนวณและเฉลยโจทย์ข้อสอบเก่า
              </p>
            </Link>

            {/* Chemistry Card */}
            <Link
              href="/quizzes/chemistry"
              className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/[0.08] hover:border-emerald-500/40 transition-all hover:-translate-y-1 group text-left space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Chemistry A-Level
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                แบบทดสอบ 13 บทเรียน ครอบคลุมปฏิกิริยาเคมีและสารอินทรีย์
              </p>
            </Link>

            {/* Course Hub Card */}
            <Link
              href="/course"
              className="p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/[0.08] hover:border-white/30 transition-all hover:-translate-y-1 group text-left space-y-3 sm:col-span-2 md:col-span-1"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/80 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-white transition-colors">
                All Curriculum
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                ภาพรวมวิชาทั้งหมด ฟิสิกส์ เคมี ชีววิทยา และคณิตศาสตร์
              </p>
            </Link>
          </div>

          {/* Minimal Clean Footer */}
          <div className="pt-10 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-white/30 gap-4">
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