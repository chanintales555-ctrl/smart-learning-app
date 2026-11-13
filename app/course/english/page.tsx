'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Lenis from 'lenis';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Clock,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Box,
  LogOut,
  Layers,
} from 'lucide-react';
import { ENGLISH_CHAPTERS } from '@/lib/englishPretestData';

const EnglishCourseCanvas = dynamic(
  () => import('@/components/canvas/EnglishCourseCanvas'),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-[#030306]" />,
  }
);

interface SavedPretestSummary {
  totalScore: number;
  totalQuestions: number;
  percentage: number;
  elapsedSeconds: number;
  submittedAt?: string;
}

export default function EnglishCoursePage() {
  const { data: session, status: sessionStatus } = useSession();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [latestScore, setLatestScore] = useState<SavedPretestSummary | null>(null);
  const [inProgressCount, setInProgressCount] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const accountKey = useMemo(() => {
    if (session?.user) {
      const rawId =
        (session.user as any).id || session.user.email || session.user.name || 'user';
      return String(rawId).trim().toLowerCase();
    }
    return 'guest';
  }, [session]);

  // Smooth Lenis Scrollytelling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
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

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, []);

  // Load Account's Latest Pre-Test Score Summary (from LocalStorage & Cloud API)
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    const localKey = `nj_english_pretest_100_${accountKey}`;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const ansCount = Object.keys(parsed.answers || {}).length;
        setInProgressCount(ansCount);
        if (Array.isArray(parsed.history) && parsed.history.length > 0) {
          setLatestScore(parsed.history[0]);
        }
      } else {
        setInProgressCount(0);
        setLatestScore(null);
      }
    } catch (e) {}

    if (session?.user) {
      fetch('/api/english-pretest', { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          if (json.authenticated && json.data) {
            const ansCount = Object.keys(json.data.answers || {}).length;
            setInProgressCount(ansCount);
            if (json.data.latestSummary) {
              setLatestScore(json.data.latestSummary);
            } else if (Array.isArray(json.data.history) && json.data.history.length > 0) {
              setLatestScore(json.data.history[0]);
            }
          }
        })
        .catch(() => {});
    }
  }, [accountKey, session?.user, sessionStatus]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const totalChapters = ENGLISH_CHAPTERS.length;
  const activeChapterIndex = Math.min(
    totalChapters,
    Math.max(1, Math.floor(scrollProgress * totalChapters) + 1)
  );

  const scrollToChapter1 = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-[#030306] text-white min-h-[1300vh] selection:bg-indigo-500/25 selection:text-indigo-200"
    >
      {/* 3D WebGL Linguistic Cosmos Scrollytelling Background */}
      <EnglishCourseCanvas scrollProgress={scrollProgress} />

      {/* Top Hairline Progress (Unified Indigo Tone) */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-blue-400 shadow-[0_0_12px_rgba(129,140,248,0.7)] transition-all duration-75"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Fixed Header Bar */}
      <header className="fixed top-6 left-0 w-full px-6 md:px-14 z-50 flex items-center justify-between pointer-events-none">
        {/* Back Button & Title */}
        <div className="pointer-events-auto flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/50 backdrop-blur-2xl border border-white/[0.1] text-sm font-semibold text-white/80 hover:text-white hover:border-white/30 transition-all hover:scale-[1.02] shadow-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Academy</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-indigo-500/20 text-xs font-mono uppercase text-indigo-300 tracking-wider">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>English A-Level · Course Curriculum</span>
          </div>
        </div>

        {/* Right Active Chapter Counter & Account */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-3xl px-4 py-2 rounded-full border border-white/[0.1] shadow-2xl">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
              Chapter
            </span>
            <span className="text-sm font-mono font-bold text-indigo-400">
              {String(activeChapterIndex).padStart(2, '0')} / {String(totalChapters).padStart(2, '0')}
            </span>
          </div>

          {session?.user ? (
            <div className="hidden md:flex items-center gap-2.5 bg-black/50 backdrop-blur-3xl pl-3.5 pr-2 py-1.5 rounded-full border border-indigo-500/25">
              <span className="text-xs font-semibold text-white/90 max-w-[110px] truncate">
                👤 {session.user.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-white/40 hover:text-red-400 p-1 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login?callbackUrl=/course/english"
              className="hidden md:inline-flex px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-white font-semibold text-xs uppercase tracking-wider transition-all"
            >
              เข้าสู่ระบบ (จำคะแนน)
            </Link>
          )}

          <Link
            href="/course/english/pretest"
            className="hidden sm:inline-flex px-5 py-2 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(129,140,248,0.35)] hover:scale-[1.02]"
          >
            Pre-Test 100 ข้อ
          </Link>
        </div>
      </header>

      {/* Floating Side Track Index */}
      <div className="fixed right-10 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end gap-3 pointer-events-none">
        {ENGLISH_CHAPTERS.map((ch, idx) => {
          const isActive = activeChapterIndex === idx + 1;
          return (
            <div key={ch.id} className="flex items-center gap-3 transition-all duration-300">
              <span
                className={`text-[10px] font-mono tracking-wider transition-all duration-300 ${
                  isActive ? 'text-indigo-400 font-bold opacity-100' : 'text-white/25 opacity-35'
                }`}
              >
                {String(idx + 1).padStart(2, '0')} {ch.cluster.split(' ')[0]}
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-400 scale-150 shadow-[0_0_8px_rgba(129,140,248,0.9)]'
                    : 'bg-white/20'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Intro Hero Screen */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-500/[0.1] border border-indigo-500/30 text-indigo-400 text-xs sm:text-sm font-mono tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Interactive 3D Linguistic Curriculum Explorer</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-none">
              ENGLISH <span className="text-white/30 font-light">COURSE</span>
            </h1>
            <p className="text-lg sm:text-xl font-light text-white/70 max-w-2xl mx-auto leading-relaxed">
              สำรวจหลักสูตรภาษาอังกฤษครบวงจร 12 บทเรียน เริ่มต้นจากการวัดพื้นฐานด้วย Pre-Test 100 ข้อ สู่การเจาะลึกไวยากรณ์ คำศัพท์ การอ่านจับใจความ และตะลุยข้อสอบแข่งขันพร้อมกระดานดำอัจฉริยะ
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/course/english/pretest"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-400 text-black hover:bg-indigo-300 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 hover:scale-[1.02] shadow-[0_0_25px_rgba(129,140,248,0.4)]"
            >
              <span>เริ่มทำ Pre-Test 100 ข้อ (บทที่ 1)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={scrollToChapter1}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-white/85 font-semibold text-xs sm:text-sm tracking-wider uppercase transition-all cursor-pointer"
            >
              เลื่อนดูโครงสร้างทั้ง 12 บทเรียน
            </button>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-white/40">
            <span>12 STRUCTURED MODULES</span>
            <span>·</span>
            <span>100-ITEM DIAGNOSTIC PRE-TEST</span>
            <span>·</span>
            <span>ACCOUNT SCORE & TIME MEMORY</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <span className="text-xs font-mono uppercase tracking-[0.3em]">
            Scroll to inspect chapters
          </span>
          <ChevronDown className="w-5 h-5 text-indigo-400" />
        </div>
      </section>

      {/* 12 Chapter Presentation Stages */}
      {ENGLISH_CHAPTERS.map((chapter, idx) => {
        const isEven = idx % 2 === 0;

        return (
          <section
            key={chapter.id}
            className={`h-screen w-full flex items-center px-6 md:px-24 relative z-10 ${
              isEven ? 'justify-start' : 'justify-end'
            }`}
          >
            <div className="max-w-xl md:max-w-2xl bg-black/45 backdrop-blur-3xl border border-white/[0.1] hover:border-indigo-500/40 p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.75)] relative group transition-all duration-500">
              {/* Subtle Indigo Ambient Glow */}
              <div className="absolute -top-10 -left-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />

              <div className="space-y-6 relative z-10">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-indigo-500/[0.1] border border-indigo-500/30 text-indigo-400 text-xs font-mono tracking-wider uppercase">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        CHAPTER {String(idx + 1).padStart(2, '0')} · {chapter.cluster}
                      </span>
                    </div>
                    {chapter.isPretest && (
                      <span className="px-3 py-1 rounded-full bg-indigo-400 text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(129,140,248,0.4)]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>พร้อมทำข้อสอบแล้ว (100 ข้อ)</span>
                      </span>
                    )}
                    {!chapter.isPretest && chapter.isAvailable && (
                      <span className="px-3 py-1 rounded-full bg-indigo-400 text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(129,140,248,0.4)]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>พร้อมเรียนแล้ว (กระดานดำ & ข้อสอบ)</span>
                      </span>
                    )}
                  </div>

                  {/* Telemetry label for 3D model */}
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                    <Box className="w-3.5 h-3.5 text-indigo-400/70" />
                    <span>{chapter.modelLabel}</span>
                  </div>
                </div>

                {/* Chapter Title */}
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                    {chapter.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-mono text-white/40 uppercase tracking-widest">
                    {chapter.engTitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-white/65 text-sm md:text-base leading-relaxed">
                  {chapter.desc}
                </p>

                {/* Sub-topics Tags */}
                <div className="flex flex-wrap gap-2">
                  {chapter.topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/75 font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                {/* Account Score Memory Box (Only on Chapter 01 Pre-Test if score/progress exists) */}
                {chapter.isPretest && (latestScore || inProgressCount > 0) && (
                  <div className="p-4 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300/80">
                        บันทึกของบัญชี {session?.user?.name || 'คุณ'}
                      </span>
                      {latestScore ? (
                        <div className="text-sm font-bold text-white">
                          คะแนนล่าสุด: {latestScore.totalScore}/{latestScore.totalQuestions} ข้อ ({latestScore.percentage}%) · เวลา {formatTime(latestScore.elapsedSeconds)}
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-white">
                          กำลังทำค้างไว้: ตอบแล้ว {inProgressCount} / 100 ข้อ
                        </div>
                      )}
                    </div>
                    <Link
                      href="/course/english/pretest"
                      className="text-xs font-mono underline text-indigo-300 hover:text-white"
                    >
                      {latestScore ? 'ดู Dashboard รายพาร์ท →' : 'ทำต่อจากเดิม →'}
                    </Link>
                  </div>
                )}

                {/* Status & Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5">
                  {chapter.isPretest ? (
                    <>
                      <Link
                        href="/course/english/pretest"
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-bold text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-[0_0_25px_rgba(129,140,248,0.4)]"
                      >
                        <span>
                          {latestScore
                            ? 'เปิด Dashboard คะแนน / สอบ Pre-Test'
                            : inProgressCount > 0
                            ? `ทำข้อสอบ Pre-Test ต่อ (${inProgressCount}/100)`
                            : 'เข้าทำข้อสอบ Pre-Test (100 ข้อ)'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </>
                  ) : chapter.isAvailable && chapter.href ? (
                    <>
                      <Link
                        href={chapter.href}
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-bold text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-[0_0_25px_rgba(129,140,248,0.4)]"
                      >
                        <span>เข้าสู่กระดานดำ & สไลด์บทเรียน</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href="/course/english/pretest"
                        className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-white/85 font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>ทำ Pre-Test 100 ข้อ</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-white/60 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>เนื้อหาบทเรียนกำลังจัดทำ</span>
                      </div>
                      <Link
                        href="/course/english/pretest"
                        className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>วัดพื้นฐานด้วย Pre-Test ก่อนเรียน</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Summary Footer Section */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
              COMPLETE ENGLISH SYLLABUS
            </h2>
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto">
              ครอบคลุมครบวงจรทั้ง 12 บทเรียน ตั้งแต่วัดพื้นฐาน Pre-Test 100 ข้อ ไวยากรณ์ คำศัพท์ การอ่าน บทสนทนา และการจำลองสอบ A-Level
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/course/english/pretest"
              className="px-8 py-4.5 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-bold text-sm sm:text-base tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(129,140,248,0.4)] hover:scale-[1.02]"
            >
              เริ่มทำ Pre-Test 100 ข้อ
            </Link>
            <Link
              href="/"
              className="px-8 py-4.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.15] text-white font-semibold text-sm sm:text-base tracking-wider uppercase transition-all"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
