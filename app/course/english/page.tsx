'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  Layers,
  Cpu,
  LogOut,
} from 'lucide-react';
import {
  ENGLISH_PARTS,
  ENGLISH_PRETEST_QUESTIONS,
  EnglishPartId,
  EnglishQuestion,
} from '@/lib/englishPretestData';

type OptionKey = 'A' | 'B' | 'C' | 'D';

interface SavedPretestState {
  answers: Record<number, OptionKey>;
  flagged: number[];
  isSubmitted: boolean;
  elapsedSeconds: number;
  submittedAt?: string;
}

const STORAGE_KEY = 'nj_english_pretest_v1';

export default function EnglishPretestPage() {
  const { data: session } = useSession();

  // Exam State
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [activeListPart, setActiveListPart] = useState<EnglishPartId | 'all'>('all');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Dashboard Review Filter State
  const [reviewPartFilter, setReviewPartFilter] = useState<EnglishPartId | 'all'>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SavedPretestState = JSON.parse(raw);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.flagged) setFlagged(parsed.flagged);
        if (typeof parsed.isSubmitted === 'boolean') setIsSubmitted(parsed.isSubmitted);
        if (typeof parsed.elapsedSeconds === 'number') setElapsedSeconds(parsed.elapsedSeconds);
      }
    } catch (err) {
      console.error('Failed to load saved English pretest state:', err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      const stateToSave: SavedPretestState = {
        answers,
        flagged,
        isSubmitted,
        elapsedSeconds,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.error('Failed to save English pretest state:', err);
    }
  }, [answers, flagged, isSubmitted, elapsedSeconds, hydrated]);

  // Timer when taking the test
  useEffect(() => {
    if (!hydrated || isSubmitted) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hydrated, isSubmitted]);

  const currentQuestion: EnglishQuestion = ENGLISH_PRETEST_QUESTIONS[currentIndex];
  const currentPartMeta = useMemo(
    () => ENGLISH_PARTS.find((p) => p.id === currentQuestion.part) || ENGLISH_PARTS[0],
    [currentQuestion]
  );

  const totalQuestions = ENGLISH_PRETEST_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Select Option
  const handleSelectOption = (questionId: number, option: OptionKey) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Toggle Flag for Review
  const handleToggleFlag = (questionId: number) => {
    setFlagged((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  // Jump to first question of a Part
  const handleJumpToPart = (partId: EnglishPartId) => {
    if (viewMode === 'list') {
      setActiveListPart(partId);
      return;
    }
    const idx = ENGLISH_PRETEST_QUESTIONS.findIndex((q) => q.part === partId);
    if (idx !== -1) {
      setCurrentIndex(idx);
    }
  };

  // Compute Analytics & Scores per Part
  const analytics = useMemo(() => {
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;

    const partStats = ENGLISH_PARTS.map((part) => {
      const questionsInPart = ENGLISH_PRETEST_QUESTIONS.filter((q) => q.part === part.id);
      let correct = 0;
      let wrong = 0;
      let unanswered = 0;
      let answered = 0;

      questionsInPart.forEach((q) => {
        const userAns = answers[q.id];
        if (!userAns) {
          unanswered++;
          totalUnanswered++;
        } else {
          answered++;
          if (userAns === q.correct) {
            correct++;
            totalCorrect++;
          } else {
            wrong++;
            totalWrong++;
          }
        }
      });

      const percentage = Math.round((correct / part.questionCount) * 100);
      let statusLabel = 'ควรเสริมพื้นฐาน';
      let statusClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      if (percentage >= 80) {
        statusLabel = 'ดีเยี่ยม (Strong)';
        statusClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      } else if (percentage >= 55) {
        statusLabel = 'ปานกลาง (Fair)';
        statusClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      }

      return {
        ...part,
        correct,
        wrong,
        unanswered,
        answered,
        percentage,
        statusLabel,
        statusClass,
      };
    });

    const totalPercentage = Math.round((totalCorrect / totalQuestions) * 100);

    let levelTitle = 'Foundation Builder (A1–A2)';
    let levelBadgeColor = 'from-rose-500 to-orange-500';
    let levelAdvice =
      'แนะนำให้เริ่มต้นปูพื้นฐานคำศัพท์หลักและโครงสร้างประโยคพื้นฐาน (Tenses & Sentence Structure) อย่างเป็นระบบ';

    if (totalPercentage >= 80) {
      levelTitle = 'Upper-Intermediate / Advanced (B2–C1)';
      levelBadgeColor = 'from-emerald-400 via-teal-400 to-cyan-400';
      levelAdvice =
        'พื้นฐานภาษาอังกฤษของคุณแข็งแกร่งมาก! พร้อมสำหรับการตะลุยโจทย์ข้อสอบแข่งขันและ A-Level ความยากระดับสูงได้ทันที';
    } else if (totalPercentage >= 60) {
      levelTitle = 'Intermediate Achiever (B1–B2)';
      levelBadgeColor = 'from-cyan-400 via-blue-400 to-indigo-400';
      levelAdvice =
        'พื้นฐานโดยรวมอยู่ในเกณฑ์ดี เข้าใจบริบทการสื่อสารและโครงสร้างหลัก แนะนำให้เก็บตกพาร์ทที่ได้คะแนนน้อยกว่า 70% เพื่ออัพคะแนนสู่ระดับท็อป';
    } else if (totalPercentage >= 45) {
      levelTitle = 'Pre-Intermediate (A2–B1)';
      levelBadgeColor = 'from-violet-400 via-purple-400 to-amber-400';
      levelAdvice =
        'มีพื้นฐานพอสมควรแต่ยังมีจุดหลอกที่เสียคะแนนง่าย แนะนำให้ทบทวน Grammar ที่ออกสอบบ่อยและฝึกสะสมคำศัพท์จากบทความสั้น';
    }

    const sortedByAccuracy = [...partStats].sort((a, b) => b.percentage - a.percentage);
    const strongestPart = sortedByAccuracy[0];
    const weakestPart = sortedByAccuracy[sortedByAccuracy.length - 1];

    return {
      totalCorrect,
      totalWrong,
      totalUnanswered,
      totalPercentage,
      partStats,
      levelTitle,
      levelBadgeColor,
      levelAdvice,
      strongestPart,
      weakestPart,
    };
  }, [answers, totalQuestions]);

  // Submit Pretest Handler
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Optional background cloud sync if logged in
    if (session?.user) {
      try {
        const resultsPayload = ENGLISH_PRETEST_QUESTIONS.map((q) => ({
          questionId: q.code,
          part: q.part,
          userAnswer: answers[q.id] || 'NONE',
          isCorrect: answers[q.id] === q.correct,
          timeSpent: (elapsedSeconds / 60).toFixed(2),
        }));

        await fetch('/api/submit-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'english',
            chapter: 'pretest-60',
            results: resultsPayload,
          }),
        });
      } catch (e) {
        // Non-blocking cloud sync
        console.warn('Cloud sync skipped:', e);
      }
    }
  };

  // Reset / Retake Pretest
  const handleResetPretest = () => {
    setAnswers({});
    setFlagged([]);
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setIsSubmitted(false);
    setShowConfirmModal(false);
    localStorage.removeItem(STORAGE_KEY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered Questions for Review Answer Key
  const filteredReviewQuestions = useMemo(() => {
    return ENGLISH_PRETEST_QUESTIONS.filter((q) => {
      const matchPart = reviewPartFilter === 'all' || q.part === reviewPartFilter;
      if (!matchPart) return false;

      const userAns = answers[q.id];
      const isCorrect = userAns === q.correct;
      if (reviewStatusFilter === 'correct') return isCorrect;
      if (reviewStatusFilter === 'wrong') return !isCorrect;
      return true;
    });
  }, [reviewPartFilter, reviewStatusFilter, answers]);

  // Filtered Questions for All-in-One List Mode
  const listModeQuestions = useMemo(() => {
    if (activeListPart === 'all') return ENGLISH_PRETEST_QUESTIONS;
    return ENGLISH_PRETEST_QUESTIONS.filter((q) => q.part === activeListPart);
  }, [activeListPart]);

  // Radar / Polygon SVG Coordinates for 4 Parts (Top, Right, Bottom, Left)
  const radarPoints = useMemo(() => {
    const center = 110;
    const maxRadius = 80;
    const pVocab = (analytics.partStats[0]?.percentage || 0) / 100;
    const pGrammar = (analytics.partStats[1]?.percentage || 0) / 100;
    const pReading = (analytics.partStats[2]?.percentage || 0) / 100;
    const pConv = (analytics.partStats[3]?.percentage || 0) / 100;

    // Ensure a minimum visual radius of 12% so 0% still shows a tiny diamond
    const r0 = Math.max(0.12, pVocab) * maxRadius;
    const r1 = Math.max(0.12, pGrammar) * maxRadius;
    const r2 = Math.max(0.12, pReading) * maxRadius;
    const r3 = Math.max(0.12, pConv) * maxRadius;

    const top = `${center},${center - r0}`;
    const right = `${center + r1},${center}`;
    const bottom = `${center},${center + r2}`;
    const left = `${center - r3},${center}`;

    return {
      polygon: `${top} ${right} ${bottom} ${left}`,
      dots: [
        { x: center, y: center - r0, color: '#a78bfa', label: 'Vocab' },
        { x: center + r1, y: center, color: '#38bdf8', label: 'Grammar' },
        { x: center, y: center + r2, color: '#34d399', label: 'Reading' },
        { x: center - r3, y: center, color: '#fbbf24', label: 'Conversation' },
      ],
    };
  }, [analytics.partStats]);

  return (
    <div className="min-h-screen bg-[#030306] text-white selection:bg-violet-500/30 selection:text-violet-200 relative overflow-x-hidden pb-24">
      {/* Ambient Cosmic Glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full bg-violet-600/12 blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-[35%] left-[50%] -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-indigo-500/5 blur-[160px] pointer-events-none z-0" />

      {/* Top Progress Hairline */}
      <div className="fixed top-0 left-0 w-full h-[3px] z-50 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(167,139,250,0.8)] transition-all duration-300"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Header Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#030306]/80 border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Back & Subject Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Academy</span>
            </Link>
            <Link
              href="/course"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white transition-all"
            >
              <span>All Courses</span>
            </Link>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>ENGLISH · PRE-TEST 60 ข้อ</span>
            </div>
          </div>

          {/* Right: Live Telemetry, Timer & User Session */}
          <div className="flex items-center gap-3">
            {/* Timer Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-white/50 hidden sm:inline">TIME</span>
              <span className="font-bold text-cyan-300">{formatTime(elapsedSeconds)}</span>
            </div>

            {/* Answered Counter Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-mono">
              <span className="text-white/50 hidden sm:inline">ANSWERED</span>
              <span className="font-bold text-violet-300">
                {answeredCount} / {totalQuestions}
              </span>
            </div>

            {/* Toggle Exam / Dashboard if already submitted */}
            {isSubmitted ? (
              <button
                onClick={handleResetPretest}
                className="px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
              >
                สอบใหม่อีกครั้ง
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-black font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
              >
                ส่งข้อสอบดูคะแนน
              </button>
            )}

            {/* User Session */}
            {session ? (
              <div className="hidden lg:flex items-center gap-2 pl-3 pr-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.1]">
                <span className="text-xs font-semibold text-white/80 max-w-[100px] truncate">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-white/40 hover:text-red-400 p-1 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 relative z-10 space-y-8">
        {/* Hero Banner */}
        <section className="relative rounded-[2.5rem] bg-gradient-to-br from-violet-950/30 via-black/60 to-cyan-950/20 border border-white/[0.1] p-6 sm:p-10 backdrop-blur-3xl shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-mono uppercase tracking-wider">
                  ENGLISH FOUNDATION & A-LEVEL
                </span>
                <span className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/60 text-xs font-mono uppercase tracking-wider">
                  4 ตัวเลือก (A, B, C, D) · เฉลยและวิเคราะห์คะแนนรายพาร์ทตอนท้าย
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase tracking-wider">
                  📚 เนื้อหาบทเรียนกำลังจัดทำ (เริ่มที่ Pre-Test ก่อน)
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                ENGLISH <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300">PRE-TEST 60 ข้อ</span>
              </h1>
              <p className="text-sm sm:text-base text-white/65 leading-relaxed">
                แบบทดสอบวัดพื้นฐานภาษาอังกฤษระดับกลาง ครบทุกทักษะสำคัญ แบ่งออกเป็น{' '}
                <span className="text-violet-300 font-semibold">Vocabulary 15 ข้อ</span> ·{' '}
                <span className="text-cyan-300 font-semibold">Grammar 20 ข้อ</span> ·{' '}
                <span className="text-emerald-300 font-semibold">Reading 10 ข้อ</span> ·{' '}
                <span className="text-amber-300 font-semibold">Conversation 15 ข้อ</span>{' '}
                พร้อมระบบประมวลผลคะแนนแยกพาร์ทและเฉลยละเอียดทันทีหลังส่งข้อสอบ
              </p>
            </div>

            {/* Part Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
              {ENGLISH_PARTS.map((p) => {
                const stat = analytics.partStats.find((s) => s.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (!isSubmitted) handleJumpToPart(p.id);
                      else setReviewPartFilter(p.id);
                    }}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-white/45">
                        PART {p.partNumber}
                      </span>
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          color: p.color,
                          borderColor: `${p.color}44`,
                          backgroundColor: `${p.color}15`,
                        }}
                      >
                        {isSubmitted
                          ? `${stat?.correct}/${p.questionCount}`
                          : `${stat?.answered}/${p.questionCount}`}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1 group-hover:text-violet-300 transition-colors">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-white/45 truncate">{p.thaiTitle}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* VIEW 1: END-OF-TEST ANALYTICS DASHBOARD & ANSWER KEY */}
        {/* ===================================================================== */}
        {isSubmitted ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Top Score & Skill Radar Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Total Score Card (7 Cols) */}
              <div className="lg:col-span-7 rounded-[2.5rem] bg-black/50 backdrop-blur-3xl border border-white/[0.1] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/15 blur-[90px] pointer-events-none" />

                <div className="space-y-6 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PRE-TEST COMPLETED · OFFICIAL SCORE REPORT</span>
                    </div>
                    <span className="text-xs font-mono text-white/45">
                      ผู้เข้าสอบ: {session?.user?.name || 'นักเรียน NJ Academy'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
                    {/* Circular Score Gauge */}
                    <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          fill="none"
                          stroke="rgba(255,255,255,0.07)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          fill="none"
                          stroke="url(#scoreGrad)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 68}
                          strokeDashoffset={
                            2 * Math.PI * 68 * (1 - analytics.totalPercentage / 100)
                          }
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a78bfa" />
                            <stop offset="50%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-4xl font-black text-white leading-none">
                          {analytics.totalCorrect}
                          <span className="text-lg text-white/40 font-semibold">/60</span>
                        </span>
                        <span className="text-sm font-mono font-bold text-cyan-300 mt-1">
                          {analytics.totalPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Level & Feedback */}
                    <div className="space-y-3 text-center sm:text-left">
                      <div className="text-xs font-mono uppercase tracking-widest text-white/45">
                        ระดับพื้นฐานของคุณ (Estimated Level)
                      </div>
                      <h2
                        className={`text-2xl sm:text-3xl font-black bg-gradient-to-r ${analytics.levelBadgeColor} bg-clip-text text-transparent`}
                      >
                        {analytics.levelTitle}
                      </h2>
                      <p className="text-sm text-white/70 leading-relaxed">
                        {analytics.levelAdvice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Metric Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/[0.08] mt-6">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[11px] font-mono text-emerald-300/70 uppercase">ตอบถูก</div>
                    <div className="text-xl font-black text-emerald-400">
                      {analytics.totalCorrect} ข้อ
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <div className="text-[11px] font-mono text-rose-300/70 uppercase">ตอบผิด</div>
                    <div className="text-xl font-black text-rose-400">{analytics.totalWrong} ข้อ</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[11px] font-mono text-white/50 uppercase">ไม่ได้ตอบ</div>
                    <div className="text-xl font-black text-white/80">
                      {analytics.totalUnanswered} ข้อ
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="text-[11px] font-mono text-cyan-300/70 uppercase">เวลาที่ใช้</div>
                    <div className="text-xl font-black text-cyan-300">
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Balance Radar & Diagnostic Card (5 Cols) */}
              <div className="lg:col-span-5 rounded-[2.5rem] bg-black/50 backdrop-blur-3xl border border-white/[0.1] p-8 flex flex-col justify-between shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-violet-400 block">
                      SKILL RADAR ANALYSIS
                    </span>
                    <h3 className="text-xl font-black text-white">สมดุลทักษะทั้ง 4 พาร์ท</h3>
                  </div>
                  <Cpu className="w-6 h-6 text-violet-400" />
                </div>

                {/* SVG Diamond Radar Chart */}
                <div className="flex items-center justify-center my-4">
                  <svg className="w-60 h-60" viewBox="0 0 220 220">
                    {/* Reference Concentric Diamonds */}
                    {[0.25, 0.5, 0.75, 1].map((scale) => {
                      const r = 80 * scale;
                      const pts = `110,${110 - r} ${110 + r},110 110,${110 + r} ${110 - r},110`;
                      return (
                        <polygon
                          key={scale}
                          points={pts}
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="1"
                        />
                      );
                    })}
                    {/* Axis lines */}
                    <line
                      x1="110"
                      y1="30"
                      x2="110"
                      y2="190"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                    <line
                      x1="30"
                      y1="110"
                      x2="190"
                      y2="110"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />

                    {/* Student Skill Polygon */}
                    <polygon
                      points={radarPoints.polygon}
                      fill="rgba(167, 139, 250, 0.25)"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />

                    {/* Vertex Dots */}
                    {radarPoints.dots.map((d, i) => (
                      <circle key={i} cx={d.x} cy={d.y} r="4.5" fill={d.color} />
                    ))}

                    {/* Axis Labels */}
                    <text
                      x="110"
                      y="18"
                      textAnchor="middle"
                      fill="#c4b5fd"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Vocab ({analytics.partStats[0]?.percentage}%)
                    </text>
                    <text
                      x="215"
                      y="114"
                      textAnchor="end"
                      fill="#7dd3fc"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Grammar ({analytics.partStats[1]?.percentage}%)
                    </text>
                    <text
                      x="110"
                      y="210"
                      textAnchor="middle"
                      fill="#6ee7b7"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Reading ({analytics.partStats[2]?.percentage}%)
                    </text>
                    <text
                      x="5"
                      y="114"
                      textAnchor="start"
                      fill="#fcd34d"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Conv ({analytics.partStats[3]?.percentage}%)
                    </text>
                  </svg>
                </div>

                {/* Strengths & Priority Focus */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                      🌟 พาร์ทที่ทำได้ดีที่สุด
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {analytics.strongestPart?.title} ({analytics.strongestPart?.percentage}%)
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                      🎯 พาร์ทที่ควรเน้นเสริม
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {analytics.weakestPart?.title} ({analytics.weakestPart?.percentage}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* PART-BY-PART SCORE DASHBOARD CARDS */}
            {/* ================================================================= */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                    PART-BY-PART PERFORMANCE DASHBOARD
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    วิเคราะห์คะแนนแยกตามพาร์ท (4 Parts · 60 ข้อ)
                  </h3>
                </div>
                <button
                  onClick={handleResetPretest}
                  className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  ทำแบบทดสอบ Pre-Test ใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {analytics.partStats.map((part) => (
                  <div
                    key={part.id}
                    className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] hover:border-white/[0.22] p-6 flex flex-col justify-between transition-all shadow-xl space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${part.badgeClass}`}
                        >
                          PART {part.partNumber}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${part.statusClass}`}
                        >
                          {part.statusLabel}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl font-black text-white">{part.title}</h4>
                        <p className="text-xs text-white/50">{part.thaiTitle}</p>
                      </div>

                      {/* Score Big Number */}
                      <div className="flex items-baseline justify-between pt-2">
                        <div>
                          <span
                            className="text-4xl font-black"
                            style={{ color: part.color }}
                          >
                            {part.correct}
                          </span>
                          <span className="text-lg text-white/40 font-bold">
                            {' '}
                            / {part.questionCount}
                          </span>
                        </div>
                        <span className="text-lg font-mono font-bold text-white/90">
                          {part.percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${part.barClass} transition-all duration-700`}
                          style={{ width: `${part.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>✅ ถูก: {part.correct} ข้อ</span>
                        <span>❌ ผิด: {part.wrong} ข้อ</span>
                        <span>⚪ ว่าง: {part.unanswered}</span>
                      </div>
                      <button
                        onClick={() => {
                          setReviewPartFilter(part.id);
                          const el = document.getElementById('answer-key-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
                      >
                        ดูเฉลยพาร์ทนี้ ({part.questionCount} ข้อ) →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ================================================================= */}
            {/* COMPLETE ANSWER KEY & EXPLANATIONS (เฉลยละเอียด 60 ข้อ) */}
            {/* ================================================================= */}
            <section id="answer-key-section" className="space-y-6 pt-4">
              <div className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
                      COMPLETE ANSWER KEY & EXPLANATIONS
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      เฉลยละเอียดพร้อมคำอธิบายครบทั้ง 60 ข้อ
                    </h3>
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'all', label: `ทั้งหมด (${totalQuestions})` },
                      {
                        id: 'wrong',
                        label: `เฉพาะข้อที่ผิด/ไม่ได้ตอบ (${
                          analytics.totalWrong + analytics.totalUnanswered
                        })`,
                      },
                      { id: 'correct', label: `เฉพาะข้อที่ถูก (${analytics.totalCorrect})` },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setReviewStatusFilter(st.id as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          reviewStatusFilter === st.id
                            ? 'bg-white text-black border-white'
                            : 'bg-white/[0.04] text-white/70 border-white/[0.1] hover:bg-white/[0.08]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Part Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.08]">
                  <button
                    onClick={() => setReviewPartFilter('all')}
                    className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                      reviewPartFilter === 'all'
                        ? 'bg-violet-500 text-black font-bold border-violet-400'
                        : 'bg-white/[0.04] text-white/60 border-white/[0.1] hover:text-white'
                    }`}
                  >
                    All Parts (60)
                  </button>
                  {ENGLISH_PARTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setReviewPartFilter(p.id)}
                      className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                        reviewPartFilter === p.id
                          ? 'bg-violet-500 text-black font-bold border-violet-400'
                          : 'bg-white/[0.04] text-white/60 border-white/[0.1] hover:text-white'
                      }`}
                    >
                      Part {p.partNumber}: {p.title} ({p.questionCount})
                    </button>
                  ))}
                </div>
              </div>

              {/* Answer Key Question Cards */}
              {filteredReviewQuestions.length === 0 ? (
                <div className="rounded-3xl bg-black/40 border border-white/[0.08] p-12 text-center text-white/60">
                  ไม่พบข้อสอบในหมวดหมู่ที่เลือก
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviewQuestions.map((q) => {
                    const userAns = answers[q.id];
                    const isCorrect = userAns === q.correct;
                    const partInfo = ENGLISH_PARTS.find((p) => p.id === q.part);

                    return (
                      <div
                        key={q.id}
                        className={`rounded-3xl bg-black/50 backdrop-blur-2xl border p-6 sm:p-8 space-y-5 transition-all ${
                          isCorrect
                            ? 'border-emerald-500/30'
                            : 'border-rose-500/30'
                        }`}
                      >
                        {/* Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 rounded-xl bg-white/[0.08] font-mono font-bold text-sm text-white">
                              ข้อที่ {q.id}
                            </span>
                            <span
                              className={`text-xs font-mono px-3 py-1 rounded-full border ${partInfo?.badgeClass}`}
                            >
                              Part {partInfo?.partNumber}: {partInfo?.title}
                            </span>
                          </div>

                          <div>
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                                ✅ ตอบถูก (เลือก {userAns})
                              </span>
                            ) : userAns ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                                ❌ ตอบผิด (คุณเลือก {userAns} · เฉลย {q.correct})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                                ⚪ ไม่ได้เลือกคำตอบ (เฉลย {q.correct})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Passage if Reading */}
                        {q.passageText && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-2">
                            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                              📖 {q.passageTitle}
                            </div>
                            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                              {q.passageText}
                            </p>
                          </div>
                        )}

                        {/* Question Text */}
                        <div className="text-base sm:text-lg font-bold text-white whitespace-pre-line leading-relaxed">
                          {q.question}
                        </div>

                        {/* 4 Choices Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(['A', 'B', 'C', 'D'] as OptionKey[]).map((opt) => {
                            const isThisCorrect = q.correct === opt;
                            const isThisSelected = userAns === opt;

                            let optionStyle =
                              'bg-white/[0.03] border-white/[0.08] text-white/70';
                            if (isThisCorrect) {
                              optionStyle =
                                'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)]';
                            } else if (isThisSelected && !isThisCorrect) {
                              optionStyle =
                                'bg-rose-500/20 border-rose-400 text-rose-200 font-semibold';
                            }

                            return (
                              <div
                                key={opt}
                                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${optionStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                      isThisCorrect
                                        ? 'bg-emerald-400 text-black'
                                        : isThisSelected
                                        ? 'bg-rose-400 text-black'
                                        : 'bg-white/[0.08] text-white/60'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                  <span className="text-sm sm:text-base">{q.options[opt]}</span>
                                </div>
                                {isThisCorrect && (
                                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 shrink-0">
                                    เฉลย
                                  </span>
                                )}
                                {isThisSelected && !isThisCorrect && (
                                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-rose-400/20 text-rose-300 shrink-0">
                                    ที่คุณเลือก
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-sm text-violet-100 leading-relaxed">
                          <span className="font-bold text-violet-300 mr-2">💡 คำอธิบายเฉลย:</span>
                          {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* =================================================================== */
          /* VIEW 2: ACTIVE PRE-TEST EXAM INTERFACE (60 QUESTIONS) */
          /* =================================================================== */
          <div className="space-y-6">
            {/* Part Switcher & View Mode Controls */}
            <div className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* 4 Part Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {ENGLISH_PARTS.map((part) => {
                  const isCurrentPart =
                    viewMode === 'single'
                      ? currentQuestion.part === part.id
                      : activeListPart === part.id;
                  const stat = analytics.partStats.find((s) => s.id === part.id);

                  return (
                    <button
                      key={part.id}
                      onClick={() => handleJumpToPart(part.id)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2.5 border ${
                        isCurrentPart
                          ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.04] text-white/75 border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>
                        Part {part.partNumber}: {part.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                          isCurrentPart
                            ? 'bg-black/15 text-black'
                            : 'bg-white/[0.08] text-white/60'
                        }`}
                      >
                        {stat?.answered}/{part.questionCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* View Mode Switcher (Single Question Focus vs All-in-One List) */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    viewMode === 'single'
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                      : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white'
                  }`}
                >
                  ทำทีละข้อ (Focus)
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    viewMode === 'list'
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                      : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white'
                  }`}
                >
                  แสดงเรียงทุกข้อ (List)
                </button>
              </div>
            </div>

            {viewMode === 'single' ? (
              /* ---------------- SINGLE QUESTION FOCUS MODE ---------------- */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Active Question Card (8 Cols) */}
                <div className="lg:col-span-8 rounded-[2.5rem] bg-black/55 backdrop-blur-3xl border border-white/[0.1] p-6 sm:p-10 shadow-2xl space-y-7 relative overflow-hidden">
                  {/* Question Top Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-mono font-bold px-3.5 py-1.5 rounded-full border ${currentPartMeta.badgeClass}`}
                      >
                        PART {currentPartMeta.partNumber} · {currentPartMeta.title.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-white/45 hidden sm:inline">
                        ({currentPartMeta.thaiTitle})
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleToggleFlag(currentQuestion.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-mono border transition-all cursor-pointer ${
                          flagged.includes(currentQuestion.id)
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/[0.04] border-white/[0.1] text-white/50 hover:text-white'
                        }`}
                      >
                        {flagged.includes(currentQuestion.id) ? '★ ติดดาวทบทวนแล้ว' : '☆ ติดดาวทบทวน'}
                      </button>
                      <div className="px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] font-mono font-bold text-sm text-cyan-300">
                        ข้อที่ {currentQuestion.id} / {totalQuestions}
                      </div>
                    </div>
                  </div>

                  {/* Reading Passage Card (Only for Part 3 Reading) */}
                  {currentQuestion.passageText && (
                    <div className="p-5 sm:p-6 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        <BookOpen className="w-4 h-4" />
                        <span>{currentQuestion.passageTitle}</span>
                      </div>
                      <p className="text-sm sm:text-base text-white/85 leading-relaxed">
                        {currentQuestion.passageText}
                      </p>
                    </div>
                  )}

                  {/* Question Prompt */}
                  <div className="text-xl sm:text-2xl font-bold text-white leading-relaxed whitespace-pre-line">
                    {currentQuestion.question}
                  </div>

                  {/* 4 Multiple Choice Buttons */}
                  <div className="grid grid-cols-1 gap-3.5">
                    {(['A', 'B', 'C', 'D'] as OptionKey[]).map((opt) => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleSelectOption(currentQuestion.id, opt)}
                          className={`group p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-4 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-violet-600/35 to-cyan-600/25 border-violet-400 shadow-[0_0_25px_rgba(139,92,246,0.25)]'
                              : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/[0.2]'
                          }`}
                        >
                          <span
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-mono font-black text-sm sm:text-base shrink-0 transition-all ${
                              isSelected
                                ? 'bg-white text-black shadow-md'
                                : 'bg-white/[0.07] text-white/60 group-hover:text-white'
                            }`}
                          >
                            {opt}
                          </span>
                          <span
                            className={`text-base sm:text-lg font-medium ${
                              isSelected ? 'text-white font-semibold' : 'text-white/80'
                            }`}
                          >
                            {currentQuestion.options[opt]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Prev / Next / Submit Navigation */}
                  <div className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="px-6 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-25 border border-white/[0.1] text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ข้อก่อนหน้า</span>
                    </button>

                    <div className="flex items-center gap-3">
                      {currentIndex < totalQuestions - 1 ? (
                        <button
                          onClick={() =>
                            setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                          }
                          className="px-8 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer"
                        >
                          <span>ข้อถัดไป</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowConfirmModal(true)}
                          className="px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(52,211,153,0.4)] cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ส่งกระดาษคำตอบและดูผลคะแนน</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Question Grid Navigator (4 Cols) */}
                <div className="lg:col-span-4 rounded-[2.5rem] bg-black/50 backdrop-blur-3xl border border-white/[0.1] p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-white/45 block">
                        QUESTION NAVIGATOR
                      </span>
                      <h3 className="text-lg font-black text-white">กระดาษคำตอบ 60 ข้อ</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-violet-300">
                      ตอบแล้ว {answeredCount}/60
                    </span>
                  </div>

                  {/* Grouped by Part */}
                  <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                    {ENGLISH_PARTS.map((part) => {
                      const partQuestions = ENGLISH_PRETEST_QUESTIONS.filter(
                        (q) => q.part === part.id
                      );
                      return (
                        <div key={part.id} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white/80">
                              Part {part.partNumber}: {part.title}
                            </span>
                            <span className="font-mono text-white/40">
                              {partQuestions.filter((q) => answers[q.id]).length}/
                              {part.questionCount}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {partQuestions.map((q) => {
                              const idx = q.id - 1;
                              const isCurrent = currentIndex === idx;
                              const isAns = Boolean(answers[q.id]);
                              const isFlag = flagged.includes(q.id);

                              return (
                                <button
                                  key={q.id}
                                  onClick={() => setCurrentIndex(idx)}
                                  className={`h-10 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer relative flex items-center justify-center border ${
                                    isCurrent
                                      ? 'bg-white text-black border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                                      : isAns
                                      ? 'bg-violet-500/25 text-violet-200 border-violet-500/40 hover:bg-violet-500/35'
                                      : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:bg-white/[0.1] hover:text-white'
                                  }`}
                                >
                                  <span>{q.id}</span>
                                  {isAns && (
                                    <span className="text-[9px] ml-0.5 opacity-80">
                                      ({answers[q.id]})
                                    </span>
                                  )}
                                  {isFlag && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit CTA in Sidebar */}
                  <div className="pt-4 border-t border-white/[0.08] space-y-3">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-400 hover:opacity-95 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
                    >
                      ส่งคำตอบและดู Dashboard คะแนน
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ---------------- ALL-IN-ONE LIST MODE ---------------- */
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                  <div className="text-sm text-white/70">
                    กำลังแสดงข้อสอบแบบเรียงรายการ ({listModeQuestions.length} ข้อ)
                  </div>
                  <button
                    onClick={() => setActiveListPart('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-mono uppercase border cursor-pointer ${
                      activeListPart === 'all'
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-white/[0.04] text-white/60 border-white/[0.1]'
                    }`}
                  >
                    แสดงครบทั้ง 60 ข้อ
                  </button>
                </div>

                {listModeQuestions.map((q) => {
                  const partInfo = ENGLISH_PARTS.find((p) => p.id === q.part);
                  return (
                    <div
                      key={q.id}
                      className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 space-y-5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-xl bg-white/[0.08] font-mono font-bold text-sm text-cyan-300">
                            ข้อที่ {q.id} / 60
                          </span>
                          <span
                            className={`text-xs font-mono px-3 py-1 rounded-full border ${partInfo?.badgeClass}`}
                          >
                            Part {partInfo?.partNumber}: {partInfo?.title}
                          </span>
                        </div>
                        {answers[q.id] && (
                          <span className="text-xs font-mono text-violet-300">
                            เลือกข้อ {answers[q.id]} แล้ว
                          </span>
                        )}
                      </div>

                      {q.passageText && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-2">
                          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                            📖 {q.passageTitle}
                          </div>
                          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                            {q.passageText}
                          </p>
                        </div>
                      )}

                      <div className="text-base sm:text-lg font-bold text-white whitespace-pre-line">
                        {q.question}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(['A', 'B', 'C', 'D'] as OptionKey[]).map((opt) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleSelectOption(q.id, opt)}
                              className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-600/30 border-violet-400 text-white font-semibold'
                                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-white/75'
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-white text-black'
                                    : 'bg-white/[0.08] text-white/60'
                                }`}
                              >
                                {opt}
                              </span>
                              <span className="text-sm sm:text-base">{q.options[opt]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-center pt-6">
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="px-10 py-4 rounded-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-400 text-black font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_0_30px_rgba(139,92,246,0.4)] cursor-pointer"
                  >
                    ส่งกระดาษคำตอบและดูผลคะแนน ({answeredCount}/60 ข้อ)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* SUBMIT CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-[2.5rem] bg-[#0b0b12] border border-white/[0.15] p-8 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center mx-auto text-violet-300">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">ยืนยันการส่งข้อสอบ Pre-Test?</h3>
              <p className="text-sm text-white/65 leading-relaxed">
                คุณตอบคำถามไปแล้ว{' '}
                <span className="text-cyan-300 font-bold">
                  {answeredCount} จาก {totalQuestions} ข้อ
                </span>
                {answeredCount < totalQuestions
                  ? ` (ยังเหลืออีก ${totalQuestions - answeredCount} ข้อที่ยังไม่ได้เลือกคำตอบ)`
                  : ' ครบทุกข้อเรียบร้อยแล้ว!'}
              </p>
            </div>

            {/* Part Status Summary */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              {ENGLISH_PARTS.map((p) => {
                const stat = analytics.partStats.find((s) => s.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs"
                  >
                    <span className="text-white/75 font-semibold">{p.title}</span>
                    <span className="font-mono font-bold text-violet-300">
                      {stat?.answered}/{p.questionCount}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
              >
                กลับไปทำต่อ
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-3.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 hover:from-violet-400 hover:to-cyan-300 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
              >
                ดูผลคะแนนและเฉลยทันที
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
