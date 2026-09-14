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
  Compass, 
  GraduationCap, 
  LogOut, 
  User as UserIcon 
} from 'lucide-react';

// Dynamically import CosmicCanvas to avoid SSR WebGL errors
const CosmicCanvas = dynamic(() => import('@/components/canvas/CosmicCanvas'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#05050a]" />,
});

export default function Home() {
  const { data: session } = useSession();
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Lenis smooth scroll
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

  return (
    <div ref={containerRef} className="relative bg-[#05050a] text-white min-h-[400vh] selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Background Canvas */}
      <CosmicCanvas scrollProgress={scrollProgress} />

      {/* Top Cosmic Progress Line */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.8)] transition-all duration-75"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Global Fixed Navigation Header */}
      <header className="fixed top-0 left-0 w-full p-6 md:px-12 z-50 flex items-center justify-between pointer-events-none">
        {/* Brand Logo */}
        <Link href="/" className="pointer-events-auto flex items-center gap-3.5 group">
          <div className="w-11 h-11 relative flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl group-hover:border-cyan-500/40 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <img 
              src="/logo.png" 
              alt="NJ Logo" 
              className="w-8 h-8 object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.6)] group-hover:scale-110 transition-transform duration-300" 
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent italic leading-none">
              NJ TUTOR
            </span>
            <span className="text-[9px] text-cyan-400 tracking-[0.35em] font-bold uppercase opacity-75 group-hover:opacity-100 transition-opacity">
              Academy
            </span>
          </div>
        </Link>

        {/* Navigation & Session Controls */}
        <div className="pointer-events-auto flex items-center gap-3 md:gap-5">
          <nav className="hidden md:flex items-center gap-1.5 bg-black/40 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
            <Link 
              href="/quizzes" 
              className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              Quizzes
            </Link>
            <Link 
              href="/course" 
              className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Courses
            </Link>
            <Link 
              href="/admin" 
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              Admin
            </Link>
          </nav>

          {/* User Session HUD */}
          {session ? (
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-[8px] text-cyan-400 uppercase font-black tracking-wider">Explorer</p>
                <p className="text-xs font-bold text-gray-200">{session.user?.name}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xs text-white shadow-lg border border-white/20">
                {session.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button 
                onClick={() => signOut()}
                className="text-gray-400 hover:text-red-400 p-1.5 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                href="/login" 
                className="px-5 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/15 transition-all hover:scale-105"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="hidden sm:inline-flex px-5 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Orbit Waypoint Indicators (Floating on Left) */}
      <div className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-6">
        {[
          { label: 'Deep Space', progress: 0.05, icon: Compass },
          { label: 'Spacetime & Physics', progress: 0.38, icon: Atom },
          { label: 'Molecules & Chemistry', progress: 0.70, icon: FlaskConical },
          { label: 'Mission Control', progress: 0.95, icon: Sparkles },
        ].map((item, idx) => {
          const Icon = item.icon;
          const isActive = 
            (idx === 0 && scrollProgress < 0.25) ||
            (idx === 1 && scrollProgress >= 0.25 && scrollProgress < 0.55) ||
            (idx === 2 && scrollProgress >= 0.55 && scrollProgress < 0.85) ||
            (idx === 3 && scrollProgress >= 0.85);

          return (
            <button
              key={item.label}
              onClick={() => scrollToSection(item.progress)}
              className="group flex items-center gap-3 cursor-pointer"
            >
              <div 
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border ${
                  isActive 
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.5)] scale-110' 
                    : 'bg-black/30 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/30'
                } backdrop-blur-xl`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span 
                className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 opacity-0 group-hover:opacity-100 ${
                  isActive ? 'text-cyan-400 font-black' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO LAUNCHPAD (Scroll 0% - 25%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
          {/* Subtle Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 backdrop-blur-xl text-cyan-400 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Procedural 3D Cosmic Learning · เรียนฟรี 100%</span>
          </div>

          {/* Epic Main Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
              COSMIC ODYSSEY
            </h1>
            <p className="text-xl sm:text-2xl font-light text-cyan-200/80 tracking-wide font-serif italic max-w-2xl mx-auto">
              “I have learned more from my <span className="text-white font-sans font-black not-italic underline decoration-cyan-500/60 decoration-wavy">mistakes</span> than from my successes”
            </p>
            <p className="text-xs text-gray-400 font-mono tracking-widest uppercase">
              — Sir Humphry Davy · Pioneer of Chemistry & Physics
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button
              onClick={() => scrollToSection(0.38)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>เริ่มท่องจักรวาลความรู้</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/quizzes"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-gray-300 font-bold text-sm tracking-wider uppercase backdrop-blur-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>คลังข้อสอบ Quizzes</span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator at bottom */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-cyan-400">Scroll to warp</span>
          <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: 🪐 PHYSICS REALM (Scroll 25% - 55%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex items-center justify-start px-6 md:px-24 relative z-10">
        <div className="max-w-xl bg-black/40 backdrop-blur-2xl border border-cyan-500/30 p-8 md:p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(14,165,233,0.15)] relative group hover:border-cyan-500/50 transition-all duration-500">
          {/* Subtle Ambient Card Glow */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/20 rounded-full blur-[70px] pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-black tracking-widest uppercase">
              <Atom className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Spacetime Gravity Well · Relativistic Singularity</span>
            </div>

            {/* Title & Concept */}
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-white">
                PHYSICS <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">A-LEVEL</span>
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                ดำดิ่งสู่กรวยกาล-อวกาศที่บิดเบี้ยว (Warped Spacetime) และจานพลาสมาสะสมมวล (Accretion Disk) พร้อมลำอนุภาคพวยพุ่ง Relativistic Jets ศึกษาธรรมชาติของแรง การเคลื่อนที่ คลื่น แสง เสียง ตลอดจนฟิสิกส์นิวเคลียร์และอนุภาค 19 บทเต็ม
              </p>
            </div>

            {/* Curriculum Highlights */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-cyan-400 font-bold block mb-1">บทที่ 01 - 08</span>
                กลศาสตร์ & การเคลื่อนที่
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-cyan-400 font-bold block mb-1">บทที่ 09 - 12</span>
                คลื่น เสียง แสง
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-cyan-400 font-bold block mb-1">บทที่ 13 - 15</span>
                ไฟฟ้าสถิต & แม่เหล็ก
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-cyan-400 font-bold block mb-1">บทที่ 16 - 19</span>
                อะตอม & นิวเคลียร์
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/quizzes/physics"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2"
              >
                <Atom className="w-4 h-4" />
                <span>เข้าสู่คลังข้อสอบฟิสิกส์</span>
              </Link>
              <Link
                href="/course"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
              >
                <span>ดูบทเรียนทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 🧪 CHEMISTRY REALM (Scroll 55% - 85%) */}
      {/* ========================================================================= */}
      <section className="h-screen w-full flex items-center justify-end px-6 md:px-24 relative z-10">
        <div className="max-w-xl bg-black/40 backdrop-blur-2xl border border-emerald-500/30 p-8 md:p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.15)] relative group hover:border-emerald-500/50 transition-all duration-500">
          {/* Subtle Ambient Card Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-[70px] pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-black tracking-widest uppercase">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <span>DNA Double Helix · Quantum Electron Orbitals</span>
            </div>

            {/* Title & Concept */}
            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-white">
                CHEMISTRY <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">A-LEVEL</span>
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                หมุนวนสู่โครงสร้างเกลียวคู่ดีเอ็นเอ (DNA Double Helix) และกลุ่มหมอกความน่าจะเป็นของอิเล็กตรอน (Quantum Orbitals) เจาะลึกตารางธาตุ พันธะเคมี ปริมาณสัมพันธ์ สมดุล กรด-เบส และเคมีอินทรีย์ ครอบคลุม 13 บทเรียน
              </p>
            </div>

            {/* Curriculum Highlights */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-emerald-400 font-bold block mb-1">บทที่ 01 - 04</span>
                ความปลอดภัย & อะตอม & โมล
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-emerald-400 font-bold block mb-1">บทที่ 05 - 07</span>
                สารละลาย ปริมาณสัมพันธ์ แก๊ส
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-emerald-400 font-bold block mb-1">บทที่ 08 - 10</span>
                อัตราปฏิกิริยา สมดุล กรด-เบส
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-gray-300">
                <span className="text-emerald-400 font-bold block mb-1">บทที่ 11 - 13</span>
                ไฟฟ้าเคมี & เคมีอินทรีย์
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/quizzes/chemistry"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-wider uppercase transition-all hover:scale-105 shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2"
              >
                <FlaskConical className="w-4 h-4" />
                <span>เข้าสู่คลังข้อสอบเคมี</span>
              </Link>
              <Link
                href="/course"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
              >
                <span>ดูบทเรียนทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-black tracking-widest uppercase text-gray-300">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>NJ TUTOR Mission Control</span>
            </div>
            <h2 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase text-white">
              READY TO <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">CONQUER</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
              พร้อมลุยบทเรียนและทำโจทย์เพื่อพิชิตคะแนน A-Level ในฝันแล้วหรือยัง? เลือกเส้นทางการเรียนรู้ของคุณได้ทันที
            </p>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* Physics Card */}
            <Link
              href="/quizzes/physics"
              className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-500/60 transition-all hover:scale-105 group text-left space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Atom className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic uppercase text-white group-hover:text-cyan-400 transition-colors">
                Physics Quizzes
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                ทำแบบฝึกหัดฟิสิกส์ 19 บท จับเวลา ประเมินผล และดูเฉลยละเอียด
              </p>
            </Link>

            {/* Chemistry Card */}
            <Link
              href="/quizzes/chemistry"
              className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-500/60 transition-all hover:scale-105 group text-left space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic uppercase text-white group-hover:text-emerald-400 transition-colors">
                Chemistry Quizzes
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                โจทย์เคมี 13 บท เข้มข้นครบทุกสัดส่วน ตะลุยโจทย์ได้ไม่จำกัด
              </p>
            </Link>

            {/* Course Hub Card */}
            <Link
              href="/course"
              className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/60 transition-all hover:scale-105 group text-left space-y-3 sm:col-span-2 md:col-span-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic uppercase text-white group-hover:text-purple-400 transition-colors">
                Course Selection
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                เลือกเรียนวิชา ฟิสิกส์ เคมี ชีววิทยา และคณิตศาสตร์ แบบครบวงจร
              </p>
            </Link>
          </div>

          {/* Footer Bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <span className="font-mono">© NJ TUTOR ACADEMY · OPEN LEARNING PLATFORM</span>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => scrollToSection(0)}
                className="hover:text-cyan-400 transition-colors cursor-pointer"
              >
                ↑ Warp to Top
              </button>
              <Link href="/admin" className="hover:text-white transition-colors">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}