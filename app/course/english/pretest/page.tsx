'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
  GraduationCap,
  Cpu,
  LogOut,
  Layers,
} from 'lucide-react';
import {
  ENGLISH_PARTS,
  ENGLISH_PRETEST_QUESTIONS,
  EnglishPartId,
  EnglishQuestion,
} from '@/lib/englishPretestData';

type OptionKey = 'A' | 'B' | 'C' | 'D';

interface AttemptSummary {
  attemptId: string;
  submittedAt: string;
  totalScore: number;
  totalQuestions: number;
  percentage: number;
  elapsedSeconds: number;
  partScores: {
    id: string;
    title: string;
    correct: number;
    total: number;
    percentage: number;
    timeSeconds: number;
  }[];
}

interface SavedPretestState {
  answers: Record<number, OptionKey>;
  questionTimes: Record<number, number>;
  flagged: number[];
  isSubmitted: boolean;
  elapsedSeconds: number;
  latestSummary?: AttemptSummary | null;
  history?: AttemptSummary[];
}

export default function EnglishPretestExamPage() {
  const { data: session, status: sessionStatus } = useSession();

  const accountKey = useMemo(() => {
    if (session?.user) {
      const rawId =
        (session.user as any).id || session.user.email || session.user.name || 'user';
      return String(rawId).trim().toLowerCase();
    }
    return 'guest';
  }, [session]);

  const localStorageKey = `nj_english_pretest_100_${accountKey}`;

  // Exam State
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');
  const [activeListPart, setActiveListPart] = useState<EnglishPartId | 'all'>('all');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [history, setHistory] = useState<AttemptSummary[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  // Dashboard Review Filter State
  const [reviewPartFilter, setReviewPartFilter] = useState<EnglishPartId | 'all'>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  const currentQuestion: EnglishQuestion =
    ENGLISH_PRETEST_QUESTIONS[currentIndex] || ENGLISH_PRETEST_QUESTIONS[0];
  const currentQuestionIdRef = useRef<number>(currentQuestion.id);

  useEffect(() => {
    currentQuestionIdRef.current = currentQuestion.id;
  }, [currentQuestion.id]);

  // 1. Load saved state (Per-account localStorage + Cloud API if logged in)
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    let isMounted = true;

    const loadState = async () => {
      // First load from per-account localStorage
      try {
        const raw = localStorage.getItem(localStorageKey);
        if (raw && isMounted) {
          const parsed: SavedPretestState = JSON.parse(raw);
          setAnswers(parsed.answers || {});
          setQuestionTimes(parsed.questionTimes || {});
          setFlagged(parsed.flagged || []);
          setIsSubmitted(Boolean(parsed.isSubmitted));
          setElapsedSeconds(Number(parsed.elapsedSeconds) || 0);
          setHistory(Array.isArray(parsed.history) ? parsed.history : []);
        } else if (isMounted) {
          setAnswers({});
          setQuestionTimes({});
          setFlagged([]);
          setIsSubmitted(false);
          setElapsedSeconds(0);
          setHistory([]);
        }
      } catch (err) {
        console.warn('Local load warning:', err);
      }

      // If authenticated, fetch account-bound record from cloud API
      if (session?.user) {
        try {
          const res = await fetch('/api/english-pretest', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json.authenticated && json.data && isMounted) {
              const cloud: SavedPretestState = json.data;
              const cloudAnsCount = Object.keys(cloud.answers || {}).length;
              const localRaw = localStorage.getItem(localStorageKey);
              const localParsed: SavedPretestState | null = localRaw
                ? JSON.parse(localRaw)
                : null;
              const localAnsCount = Object.keys(localParsed?.answers || {}).length;

              // Prefer cloud if cloud is submitted, has history, or has >= answers
              if (
                cloud.isSubmitted ||
                (cloud.history && cloud.history.length > 0) ||
                cloudAnsCount >= localAnsCount
              ) {
                setAnswers(cloud.answers || {});
                setQuestionTimes(cloud.questionTimes || {});
                setFlagged(cloud.flagged || []);
                setIsSubmitted(Boolean(cloud.isSubmitted));
                setElapsedSeconds(Number(cloud.elapsedSeconds) || 0);
                setHistory(Array.isArray(cloud.history) ? cloud.history : []);
                setSyncStatus('synced');
              }
            }
          }
        } catch (err) {
          console.warn('Cloud fetch warning:', err);
        }
      }

      if (isMounted) {
        setHydrated(true);
      }
    };

    loadState();

    return () => {
      isMounted = false;
    };
  }, [localStorageKey, session?.user, sessionStatus]);

  // 2. Save state to per-account localStorage automatically
  useEffect(() => {
    if (!hydrated) return;
    try {
      const stateToSave: SavedPretestState = {
        answers,
        questionTimes,
        flagged,
        isSubmitted,
        elapsedSeconds,
        history,
      };
      localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn('Failed to save English pretest state to localStorage:', err);
    }
  }, [answers, questionTimes, flagged, isSubmitted, elapsedSeconds, history, hydrated, localStorageKey]);

  // Helper to sync state to Cloud Account
  const syncToCloudAccount = useCallback(
    async (overridePayload?: Partial<SavedPretestState>) => {
      if (!session?.user) return;
      setSyncStatus('syncing');
      try {
        const payload = {
          answers: overridePayload?.answers ?? answers,
          questionTimes: overridePayload?.questionTimes ?? questionTimes,
          flagged: overridePayload?.flagged ?? flagged,
          isSubmitted: overridePayload?.isSubmitted ?? isSubmitted,
          elapsedSeconds: overridePayload?.elapsedSeconds ?? elapsedSeconds,
          latestSummary: overridePayload?.latestSummary ?? null,
          history: overridePayload?.history ?? history,
        };
        const res = await fetch('/api/english-pretest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.history) {
            setHistory(json.data.history);
          }
          setSyncStatus('synced');
        } else {
          setSyncStatus('idle');
        }
      } catch (e) {
        setSyncStatus('idle');
      }
    },
    [session?.user, answers, questionTimes, flagged, isSubmitted, elapsedSeconds, history]
  );

  // 3. Live 1-Second Timer (tracks both total elapsedSeconds and per-question time!)
  useEffect(() => {
    if (!hydrated || isSubmitted || isPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      const qId = currentQuestionIdRef.current;
      setQuestionTimes((prev) => ({
        ...prev,
        [qId]: (prev[qId] || 0) + 1,
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [hydrated, isSubmitted, isPaused]);

  const currentPartMeta = useMemo(
    () => ENGLISH_PARTS.find((p) => p.id === currentQuestion.part) || ENGLISH_PARTS[0],
    [currentQuestion]
  );

  const totalQuestions = ENGLISH_PRETEST_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;

  // Format MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = secs % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const formatReadableTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    if (mins === 0) return `${rem} วินาที`;
    return `${mins} นาที ${rem} วินาที`;
  };

  // Select Option
  const handleSelectOption = (questionId: number, option: OptionKey) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
    currentQuestionIdRef.current = questionId;
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

  // Compute Analytics, Scores per Part, and Time Statistics
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
      let partTimeSeconds = 0;

      questionsInPart.forEach((q) => {
        partTimeSeconds += questionTimes[q.id] || 0;
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
      const avgSecondsPerQuestion = Number(
        (partTimeSeconds / Math.max(1, part.questionCount)).toFixed(1)
      );

      let statusLabel = 'ควรเสริมพื้นฐาน';
      if (percentage >= 80) {
        statusLabel = 'ดีเยี่ยม (Strong)';
      } else if (percentage >= 55) {
        statusLabel = 'ปานกลาง (Fair)';
      }

      return {
        ...part,
        correct,
        wrong,
        unanswered,
        answered,
        percentage,
        statusLabel,
        partTimeSeconds,
        avgSecondsPerQuestion,
      };
    });

    const totalPercentage = Math.round((totalCorrect / totalQuestions) * 100);
    const avgTimePerQuestion = Number(
      (elapsedSeconds / Math.max(1, answeredCount || totalQuestions)).toFixed(1)
    );

    // Find slowest and fastest answered questions
    const answeredIds = Object.keys(answers).map(Number);
    let slowestQuestionId: number | null = null;
    let slowestSeconds = 0;
    let fastestQuestionId: number | null = null;
    let fastestSeconds = Infinity;

    answeredIds.forEach((id) => {
      const t = questionTimes[id] || 0;
      if (t > slowestSeconds) {
        slowestSeconds = t;
        slowestQuestionId = id;
      }
      if (t > 0 && t < fastestSeconds) {
        fastestSeconds = t;
        fastestQuestionId = id;
      }
    });

    let levelTitle = 'Foundation Builder (CEFR A1–A2)';
    let levelAdvice =
      'แนะนำให้เริ่มต้นปูพื้นฐานคำศัพท์หลักและโครงสร้างประโยคพื้นฐาน (Parts of Speech & 12 Tenses) อย่างเป็นระบบ';

    if (totalPercentage >= 80) {
      levelTitle = 'Upper-Intermediate / Advanced (CEFR B2–C1)';
      levelAdvice =
        'พื้นฐานภาษาอังกฤษของคุณแข็งแกร่งมาก พร้อมสำหรับการตะลุยโจทย์ข้อสอบแข่งขันและ A-Level ความยากระดับสูงได้ทันที';
    } else if (totalPercentage >= 60) {
      levelTitle = 'Intermediate Achiever (CEFR B1–B2)';
      levelAdvice =
        'พื้นฐานโดยรวมอยู่ในเกณฑ์ดี เข้าใจบริบทการสื่อสารและโครงสร้างหลัก แนะนำให้เก็บตกพาร์ทที่ได้คะแนนน้อยกว่า 70%';
    } else if (totalPercentage >= 45) {
      levelTitle = 'Pre-Intermediate (CEFR A2–B1)';
      levelAdvice =
        'มีพื้นฐานระดับปานกลาง แนะนำให้ทบทวนหลัก Grammar ที่ออกสอบบ่อยและฝึกสะสมคำศัพท์จากบทความสั้น';
    }

    const sortedByAccuracy = [...partStats].sort((a, b) => b.percentage - a.percentage);
    const strongestPart = sortedByAccuracy[0];
    const weakestPart = sortedByAccuracy[sortedByAccuracy.length - 1];

    return {
      totalCorrect,
      totalWrong,
      totalUnanswered,
      totalPercentage,
      avgTimePerQuestion,
      slowestQuestionId,
      slowestSeconds,
      fastestQuestionId,
      fastestSeconds: fastestSeconds === Infinity ? 0 : fastestSeconds,
      partStats,
      levelTitle,
      levelAdvice,
      strongestPart,
      weakestPart,
    };
  }, [answers, questionTimes, elapsedSeconds, answeredCount, totalQuestions]);

  // Submit Pretest Handler
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    setIsPaused(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const newSummary: AttemptSummary = {
      attemptId: `ATT-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      totalScore: analytics.totalCorrect,
      totalQuestions,
      percentage: analytics.totalPercentage,
      elapsedSeconds,
      partScores: analytics.partStats.map((ps) => ({
        id: ps.id,
        title: ps.title,
        correct: ps.correct,
        total: ps.questionCount,
        percentage: ps.percentage,
        timeSeconds: ps.partTimeSeconds,
      })),
    };

    const updatedHistory = [newSummary, ...history].slice(0, 20);
    setHistory(updatedHistory);

    // Sync to per-account cloud storage
    if (session?.user) {
      await syncToCloudAccount({
        answers,
        questionTimes,
        flagged,
        isSubmitted: true,
        elapsedSeconds,
        latestSummary: newSummary,
        history: updatedHistory,
      });

      // Also send to /api/submit-answer if Google Sheets is configured
      try {
        const resultsPayload = ENGLISH_PRETEST_QUESTIONS.map((q) => ({
          questionId: q.code,
          part: q.part,
          userAnswer: answers[q.id] || 'NONE',
          isCorrect: answers[q.id] === q.correct,
          timeSpent: String(questionTimes[q.id] || 0),
        }));

        await fetch('/api/submit-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'english',
            chapter: 'pretest-100',
            results: resultsPayload,
          }),
        });
      } catch (e) {}
    }
  };

  // Reset / Retake Pretest (keeps attempt history for the account!)
  const handleResetPretest = async () => {
    setAnswers({});
    setQuestionTimes({});
    setFlagged([]);
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setIsSubmitted(false);
    setIsPaused(false);
    setShowConfirmModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (session?.user) {
      await syncToCloudAccount({
        answers: {},
        questionTimes: {},
        flagged: [],
        isSubmitted: false,
        elapsedSeconds: 0,
        history,
      });
    }
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

  // Radar / Polygon SVG Coordinates for 4 Parts
  const radarPoints = useMemo(() => {
    const center = 110;
    const maxRadius = 80;
    const pVocab = (analytics.partStats[0]?.percentage || 0) / 100;
    const pGrammar = (analytics.partStats[1]?.percentage || 0) / 100;
    const pReading = (analytics.partStats[2]?.percentage || 0) / 100;
    const pConv = (analytics.partStats[3]?.percentage || 0) / 100;

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
        { x: center, y: center - r0 },
        { x: center + r1, y: center },
        { x: center, y: center + r2 },
        { x: center - r3, y: center },
      ],
    };
  }, [analytics.partStats]);

  return (
    <div className="min-h-screen bg-[#030306] text-white selection:bg-indigo-500/25 selection:text-indigo-200 relative overflow-x-hidden pb-24">
      {/* Subtle Single-Tone Indigo Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[620px] h-[620px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[520px] h-[520px] bg-indigo-500/8 rounded-full blur-[150px]" />
      </div>

      {/* Top Progress Hairline (Unified Indigo Tone) */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-blue-400 shadow-[0_0_12px_rgba(129,140,248,0.7)] transition-all duration-300"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Header Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#030306]/85 border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Back to English Course Curriculum & Academy */}
          <div className="flex items-center gap-3">
            <Link
              href="/course/english"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs sm:text-sm font-semibold text-white/85 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>บทเรียนภาษาอังกฤษ (English Course)</span>
            </Link>
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white transition-all"
            >
              <span>Academy</span>
            </Link>
          </div>

          {/* Right: Live Timer, Pause/Resume, Answered Counter & Account */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timer Pill + Pause Toggle */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/[0.08] border border-indigo-500/25 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-white/45 hidden sm:inline">TIME</span>
              <span className="font-bold text-indigo-300">{formatTime(elapsedSeconds)}</span>
              {!isSubmitted && (
                <button
                  onClick={() => setIsPaused((p) => !p)}
                  className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 text-[10px] text-indigo-200 cursor-pointer"
                >
                  {isPaused ? 'ทำต่อ' : 'พักเวลา'}
                </button>
              )}
            </div>

            {/* Answered Counter Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-mono">
              <span className="text-white/45 hidden sm:inline">ANSWERED</span>
              <span className="font-bold text-indigo-300">
                {answeredCount} / {totalQuestions}
              </span>
            </div>

            {/* Submit / Retake Button */}
            {isSubmitted ? (
              <button
                onClick={handleResetPretest}
                className="px-4 py-2 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-xs font-bold uppercase tracking-wider text-indigo-300 transition-all cursor-pointer"
              >
                สอบใหม่อีกครั้ง
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(129,140,248,0.35)] cursor-pointer"
              >
                ส่งข้อสอบดูคะแนน
              </button>
            )}

            {/* Account Status */}
            {session?.user ? (
              <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/[0.04] border border-indigo-500/25">
                <span className="text-xs font-semibold text-white/85 max-w-[120px] truncate">
                  👤 {session.user.name}
                </span>
                <span className="text-[10px] font-mono text-indigo-300/75 hidden xl:inline">
                  {syncStatus === 'syncing'
                    ? '· กำลังซิงก์...'
                    : syncStatus === 'synced'
                    ? '· บันทึกแล้ว'
                    : ''}
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
                href="/login?callbackUrl=/course/english/pretest"
                className="px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-semibold text-white/80 hover:text-white transition-all"
              >
                เข้าสู่ระบบ (จำคะแนนรายบุคคล)
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 relative z-10 space-y-8">
        {/* Clean Single-Accent Subject Header Banner */}
        <section className="rounded-[2.5rem] bg-black/50 border border-white/[0.1] p-6 sm:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-56 h-56 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-indigo-500/[0.12] border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wider">
                  CHAPTER 01 · DIAGNOSTIC ASSESSMENT
                </span>
                <span className="px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-white/60 text-xs font-mono uppercase tracking-wider">
                  100 QUESTIONS · TIME ANALYTICS · ACCOUNT SYNC
                </span>
              </div>

              {/* Clean Single-Tone Heading */}
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                ENGLISH <span className="text-white/30 font-light">PRE-TEST 100</span>
              </h1>

              {/* Clean Single-Tone Description */}
              <p className="text-sm sm:text-base text-white/65 leading-relaxed">
                แบบทดสอบวัดพื้นฐานภาษาอังกฤษระดับกลาง จำนวน 100 ข้อ (4 ตัวเลือก) แบ่งออกเป็น Vocabulary 25 ข้อ · Grammar 30 ข้อ · Reading 20 ข้อ · Conversation 25 ข้อ พร้อมระบบจับเวลาสถิติรายพาร์ทและจดจำคะแนนผูกกับแต่ละแอคเคาท์
              </p>
            </div>

            {/* Unified Indigo Part Summary Cards */}
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
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-indigo-500/[0.08] border border-white/[0.08] hover:border-indigo-500/35 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-white/45">
                        PART {p.partNumber}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                        {isSubmitted
                          ? `${stat?.correct}/${p.questionCount}`
                          : `${stat?.answered}/${p.questionCount}`}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1.5">{p.title}</div>
                    <div className="text-[11px] text-white/45 truncate">{p.thaiTitle}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* VIEW 1: END-OF-TEST ANALYTICS DASHBOARD, TIME STATS & ANSWER KEY */}
        {/* ===================================================================== */}
        {isSubmitted ? (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Top Score & Skill Radar Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Total Score Card (7 Cols) */}
              <div className="lg:col-span-7 rounded-[2.5rem] bg-black/50 backdrop-blur-3xl border border-white/[0.1] p-8 sm:p-10 flex flex-col justify-between shadow-2xl">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span>PRE-TEST COMPLETED · OFFICIAL SCORE REPORT</span>
                    </div>
                    <span className="text-xs font-mono text-white/50">
                      แอคเคาท์: {session?.user?.name || 'ผู้เยี่ยมชม (Guest)'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
                    {/* Circular Score Gauge (Unified Indigo) */}
                    <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="12"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 68}
                          strokeDashoffset={
                            2 * Math.PI * 68 * (1 - analytics.totalPercentage / 100)
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-4xl font-black text-white leading-none">
                          {analytics.totalCorrect}
                          <span className="text-lg text-white/40 font-semibold">/100</span>
                        </span>
                        <span className="text-sm font-mono font-bold text-indigo-300 mt-1">
                          {analytics.totalPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Level & Feedback */}
                    <div className="space-y-3 text-center sm:text-left">
                      <div className="text-xs font-mono uppercase tracking-widest text-indigo-300/80">
                        ระดับพื้นฐานของคุณ (Estimated Level)
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        {analytics.levelTitle}
                      </h2>
                      <p className="text-sm text-white/65 leading-relaxed">
                        {analytics.levelAdvice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Metric Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/[0.08] mt-6">
                  <div className="p-3.5 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25">
                    <div className="text-[11px] font-mono text-indigo-300 uppercase">ตอบถูก</div>
                    <div className="text-xl font-black text-white">
                      {analytics.totalCorrect} ข้อ
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[11px] font-mono text-white/50 uppercase">ตอบผิด</div>
                    <div className="text-xl font-black text-white/80">{analytics.totalWrong} ข้อ</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[11px] font-mono text-white/50 uppercase">เวลารวมที่ใช้</div>
                    <div className="text-xl font-black text-indigo-300">
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[11px] font-mono text-white/50 uppercase">เฉลี่ยต่อข้อ</div>
                    <div className="text-xl font-black text-white">
                      {analytics.avgTimePerQuestion} วิ
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Balance Radar & Diagnostic Card (5 Cols) */}
              <div className="lg:col-span-5 rounded-[2.5rem] bg-black/50 backdrop-blur-3xl border border-white/[0.1] p-8 flex flex-col justify-between shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-indigo-300/80 block">
                      SKILL RADAR ANALYSIS
                    </span>
                    <h3 className="text-xl font-black text-white">สมดุลทักษะทั้ง 4 พาร์ท</h3>
                  </div>
                  <Cpu className="w-6 h-6 text-indigo-400" />
                </div>

                {/* SVG Diamond Radar Chart */}
                <div className="flex items-center justify-center my-4">
                  <svg className="w-60 h-60" viewBox="0 0 220 220">
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

                    <polygon
                      points={radarPoints.polygon}
                      fill="rgba(129, 140, 248, 0.22)"
                      stroke="#818cf8"
                      strokeWidth="2.5"
                    />

                    {radarPoints.dots.map((d, i) => (
                      <circle key={i} cx={d.x} cy={d.y} r="4.5" fill="#818cf8" />
                    ))}

                    <text
                      x="110"
                      y="18"
                      textAnchor="middle"
                      fill="#c7d2fe"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Vocab ({analytics.partStats[0]?.percentage}%)
                    </text>
                    <text
                      x="215"
                      y="114"
                      textAnchor="end"
                      fill="#c7d2fe"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Grammar ({analytics.partStats[1]?.percentage}%)
                    </text>
                    <text
                      x="110"
                      y="210"
                      textAnchor="middle"
                      fill="#c7d2fe"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Reading ({analytics.partStats[2]?.percentage}%)
                    </text>
                    <text
                      x="5"
                      y="114"
                      textAnchor="start"
                      fill="#c7d2fe"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      Conv ({analytics.partStats[3]?.percentage}%)
                    </text>
                  </svg>
                </div>

                {/* Strengths & Priority Focus */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="p-3.5 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                      พาร์ทที่ทำได้ดีที่สุด
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {analytics.strongestPart?.title} ({analytics.strongestPart?.percentage}%)
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                      พาร์ทที่ควรเน้นเสริม
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {analytics.weakestPart?.title} ({analytics.weakestPart?.percentage}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* PART-BY-PART SCORE & TIME DASHBOARD CARDS */}
            {/* ================================================================= */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-indigo-300/80">
                    PART-BY-PART PERFORMANCE & TIME TELEMETRY
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    คะแนนและสถิติเวลาแยกตามพาร์ท (100 ข้อ)
                  </h3>
                </div>
                <button
                  onClick={handleResetPretest}
                  className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-indigo-400 text-black hover:bg-indigo-300 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(129,140,248,0.35)] cursor-pointer"
                >
                  ทำแบบทดสอบ Pre-Test ใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {analytics.partStats.map((part) => (
                  <div
                    key={part.id}
                    className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] hover:border-indigo-500/35 p-6 flex flex-col justify-between transition-all shadow-xl space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                          PART {part.partNumber}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/75">
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
                          <span className="text-4xl font-black text-indigo-300">
                            {part.correct}
                          </span>
                          <span className="text-lg text-white/40 font-bold">
                            {' '}
                            / {part.questionCount}
                          </span>
                        </div>
                        <span className="text-lg font-mono font-bold text-white/85">
                          {part.percentage}%
                        </span>
                      </div>

                      {/* Unified Indigo Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-700"
                          style={{ width: `${part.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                      <div className="flex items-center justify-between text-xs text-white/55">
                        <span>ถูก: {part.correct}</span>
                        <span>ผิด: {part.wrong}</span>
                        <span>ว่าง: {part.unanswered}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 flex items-center justify-between text-xs font-mono text-indigo-200">
                        <span>⏱ เวลาพาร์ทนี้: {formatTime(part.partTimeSeconds)}</span>
                        <span>({part.avgSecondsPerQuestion} วิ/ข้อ)</span>
                      </div>
                      <button
                        onClick={() => {
                          setReviewPartFilter(part.id);
                          const el = document.getElementById('answer-key-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-indigo-500/15 border border-white/[0.08] hover:border-indigo-500/30 text-xs font-semibold text-white/80 hover:text-indigo-200 transition-all cursor-pointer"
                      >
                        ดูเฉลยพาร์ทนี้ ({part.questionCount} ข้อ) →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ================================================================= */}
            {/* TIME ANALYTICS & ACCOUNT ATTEMPT HISTORY */}
            {/* ================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Detailed Time Analytics Card (6 Cols) */}
              <div className="lg:col-span-6 rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-indigo-300/80 block">
                      TIME TELEMETRY REPORT
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      สถิติเวลาในการทำข้อสอบ
                    </h3>
                  </div>
                  <Clock className="w-6 h-6 text-indigo-400" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/20">
                    <div className="text-xs text-indigo-300/80">เวลารวมทั้งหมด</div>
                    <div className="text-lg sm:text-xl font-black text-white mt-1">
                      {formatReadableTime(elapsedSeconds)}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="text-xs text-white/50">ความเร็วเฉลี่ย</div>
                    <div className="text-lg sm:text-xl font-black text-white mt-1">
                      {analytics.avgTimePerQuestion} วินาที / ข้อ
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="text-xs text-white/50">ข้อที่ใช้เวลาเร็วที่สุด</div>
                    <div className="text-base font-bold text-white mt-1">
                      {analytics.fastestQuestionId
                        ? `ข้อที่ ${analytics.fastestQuestionId} (${analytics.fastestSeconds} วินาที)`
                        : '-'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="text-xs text-white/50">ข้อที่ใช้เวลานานที่สุด</div>
                    <div className="text-base font-bold text-white mt-1">
                      {analytics.slowestQuestionId
                        ? `ข้อที่ ${analytics.slowestQuestionId} (${analytics.slowestSeconds} วินาที)`
                        : '-'}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-white/50">
                    สัดส่วนเวลาที่ใช้ในแต่ละพาร์ท
                  </div>
                  {analytics.partStats.map((ps) => {
                    const timeRatio = Math.min(
                      100,
                      Math.round((ps.partTimeSeconds / Math.max(1, elapsedSeconds)) * 100)
                    );
                    return (
                      <div key={ps.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/80 font-medium">
                            Part {ps.partNumber}: {ps.title}
                          </span>
                          <span className="font-mono text-indigo-300">
                            {formatTime(ps.partTimeSeconds)} ({timeRatio}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-400"
                            style={{ width: `${timeRatio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Account Score & Attempt History (6 Cols) */}
              <div className="lg:col-span-6 rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-indigo-300/80 block">
                        ACCOUNT SCORE MEMORY
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        ประวัติคะแนนของแอคเคาท์ ({session?.user?.name || 'Guest'})
                      </h3>
                    </div>
                    <Layers className="w-6 h-6 text-indigo-400" />
                  </div>

                  {history.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center text-sm text-white/50">
                      ยังไม่มีประวัติการส่งข้อสอบก่อนหน้า
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {history.map((att, i) => (
                        <div
                          key={att.attemptId || i}
                          className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-mono font-bold text-indigo-300">
                                ครั้งที่ {history.length - i}
                              </span>
                              <span className="text-xs font-mono text-white/50">
                                {new Date(att.submittedAt).toLocaleString('th-TH')}
                              </span>
                            </div>
                            <div className="text-xs text-white/60">
                              {att.partScores
                                ?.map((p) => `${p.title.split(' ')[0]} ${p.correct}/${p.total}`)
                                .join(' · ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-white">
                              {att.totalScore}/{att.totalQuestions}{' '}
                              <span className="text-xs font-mono text-indigo-300">
                                ({att.percentage}%)
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-white/50">
                              ⏱ เวลา {formatTime(att.elapsedSeconds)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!session?.user && (
                  <div className="p-4 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-indigo-200">
                      เข้าสู่ระบบเพื่อซิงก์และจดจำสถิติคะแนนนี้ไว้ในบัญชีของคุณอย่างถาวร
                    </span>
                    <Link
                      href="/login?callbackUrl=/course/english/pretest"
                      className="px-4 py-2 rounded-full bg-indigo-400 text-black font-bold text-xs uppercase tracking-wider shrink-0"
                    >
                      เข้าสู่ระบบ
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ================================================================= */}
            {/* COMPLETE ANSWER KEY & EXPLANATIONS (เฉลยละเอียด 100 ข้อ) */}
            {/* ================================================================= */}
            <section id="answer-key-section" className="space-y-6 pt-4">
              <div className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-indigo-300/80">
                      COMPLETE ANSWER KEY & EXPLANATIONS
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      เฉลยละเอียดพร้อมคำอธิบายครบทั้ง 100 ข้อ
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
                            ? 'bg-indigo-400 text-black border-indigo-400'
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
                        ? 'bg-indigo-400 text-black font-bold border-indigo-400'
                        : 'bg-white/[0.04] text-white/60 border-white/[0.1] hover:text-white'
                    }`}
                  >
                    All Parts (100)
                  </button>
                  {ENGLISH_PARTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setReviewPartFilter(p.id)}
                      className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                        reviewPartFilter === p.id
                          ? 'bg-indigo-400 text-black font-bold border-indigo-400'
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
                    const qTime = questionTimes[q.id] || 0;

                    return (
                      <div
                        key={q.id}
                        className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 space-y-5 transition-all"
                      >
                        {/* Top Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="px-3 py-1 rounded-xl bg-white/[0.08] font-mono font-bold text-sm text-white">
                              ข้อที่ {q.id}
                            </span>
                            <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                              Part {partInfo?.partNumber}: {partInfo?.title}
                            </span>
                            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/55">
                              ⏱ ใช้เวลา {qTime} วินาที
                            </span>
                          </div>

                          <div>
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                                ✓ ตอบถูก (เลือก {userAns})
                              </span>
                            ) : userAns ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
                                ✕ ตอบผิด (คุณเลือก {userAns} · เฉลย {q.correct})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.15] text-white/70 text-xs font-bold">
                                ไม่ได้เลือกคำตอบ (เฉลย {q.correct})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Passage if Reading */}
                        {q.passageText && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/[0.05] border border-indigo-500/20 space-y-2">
                            <div className="text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold">
                              {q.passageTitle}
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
                                'bg-emerald-500/15 border-emerald-500/40 text-white font-semibold';
                            } else if (isThisSelected && !isThisCorrect) {
                              optionStyle =
                                'bg-rose-500/15 border-rose-500/40 text-white/90 font-medium';
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
                        <div className="p-4 rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/25 text-sm text-indigo-100 leading-relaxed">
                          <span className="font-bold text-indigo-300 mr-2">คำอธิบายเฉลย:</span>
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
          /* VIEW 2: ACTIVE PRE-TEST EXAM INTERFACE (100 QUESTIONS) */
          /* =================================================================== */
          <div className="space-y-6">
            {/* Part Switcher & View Mode Controls */}
            <div className="rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/[0.1] p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* 4 Part Tabs (Unified Indigo Active State) */}
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
                          ? 'bg-indigo-400 text-black border-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.3)]'
                          : 'bg-white/[0.04] text-white/70 border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span>
                        Part {part.partNumber}: {part.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                          isCurrentPart
                            ? 'bg-black/15 text-black'
                            : 'bg-indigo-500/15 text-indigo-300'
                        }`}
                      >
                        {stat?.answered}/{part.questionCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    viewMode === 'single'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                      : 'bg-white/[0.04] text-white/55 border-white/[0.08] hover:text-white'
                  }`}
                >
                  ทำทีละข้อ (Focus)
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    viewMode === 'list'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                      : 'bg-white/[0.04] text-white/55 border-white/[0.08] hover:text-white'
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
                      <span className="text-xs font-mono font-bold px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                        PART {currentPartMeta.partNumber} · {currentPartMeta.title.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-white/45 hidden sm:inline">
                        ({currentPartMeta.thaiTitle})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-indigo-300">
                        ⏱ ข้อนี้: {questionTimes[currentQuestion.id] || 0} วิ
                      </span>
                      <button
                        onClick={() => handleToggleFlag(currentQuestion.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-mono border transition-all cursor-pointer ${
                          flagged.includes(currentQuestion.id)
                            ? 'bg-indigo-400 text-black border-indigo-400 font-bold'
                            : 'bg-white/[0.04] border-white/[0.1] text-white/55 hover:text-white'
                        }`}
                      >
                        {flagged.includes(currentQuestion.id) ? '★ ติดดาวทบทวนแล้ว' : '☆ ติดดาวทบทวน'}
                      </button>
                      <div className="px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 font-mono font-bold text-sm text-indigo-200">
                        ข้อที่ {currentQuestion.id} / {totalQuestions}
                      </div>
                    </div>
                  </div>

                  {/* Reading Passage Card (Only for Part 3 Reading) */}
                  {currentQuestion.passageText && (
                    <div className="p-5 sm:p-6 rounded-3xl bg-indigo-500/[0.05] border border-indigo-500/20 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
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
                              ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_24px_rgba(129,140,248,0.2)]'
                              : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-indigo-500/30'
                          }`}
                        >
                          <span
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-mono font-black text-sm sm:text-base shrink-0 transition-all ${
                              isSelected
                                ? 'bg-indigo-400 text-black'
                                : 'bg-white/[0.07] text-white/60 group-hover:text-indigo-300'
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
                          className="px-8 py-3.5 rounded-full bg-indigo-400 text-black hover:bg-indigo-300 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(129,140,248,0.3)] flex items-center gap-2 cursor-pointer"
                        >
                          <span>ข้อถัดไป</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowConfirmModal(true)}
                          className="px-8 py-3.5 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(129,140,248,0.4)] flex items-center gap-2 cursor-pointer"
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
                      <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-300/80 block">
                        QUESTION NAVIGATOR
                      </span>
                      <h3 className="text-lg font-black text-white">กระดาษคำตอบ 100 ข้อ</h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-300">
                      ตอบแล้ว {answeredCount}/100
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
                            <span className="font-mono text-indigo-300/80">
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
                                      ? 'bg-indigo-400 text-black border-indigo-300 scale-105 shadow-[0_0_14px_rgba(129,140,248,0.5)]'
                                      : isAns
                                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 hover:bg-indigo-500/30'
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
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-400" />
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
                  <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
                    {session?.user && (
                      <button
                        onClick={() => syncToCloudAccount()}
                        className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white/80 text-xs font-semibold transition-all cursor-pointer"
                      >
                        {syncStatus === 'syncing'
                          ? 'กำลังบันทึกเข้าบัญชี...'
                          : 'บันทึกความคืบหน้าเข้าบัญชี'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full py-4 rounded-2xl bg-indigo-400 hover:bg-indigo-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(129,140,248,0.35)] cursor-pointer"
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
                        ? 'bg-indigo-400 text-black font-bold border-indigo-400'
                        : 'bg-white/[0.04] text-white/60 border-white/[0.1]'
                    }`}
                  >
                    แสดงครบทั้ง 100 ข้อ
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
                          <span className="px-3 py-1 rounded-xl bg-white/[0.08] font-mono font-bold text-sm text-white">
                            ข้อที่ {q.id} / 100
                          </span>
                          <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                            Part {partInfo?.partNumber}: {partInfo?.title}
                          </span>
                        </div>
                        {answers[q.id] && (
                          <span className="text-xs font-mono text-indigo-300">
                            เลือกข้อ {answers[q.id]} แล้ว
                          </span>
                        )}
                      </div>

                      {q.passageText && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/[0.05] border border-indigo-500/20 space-y-2">
                          <div className="text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold">
                            {q.passageTitle}
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
                                  ? 'bg-indigo-500/20 border-indigo-400 text-white font-semibold'
                                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-white/75'
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-400 text-black'
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
                    className="px-10 py-4 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_0_25px_rgba(129,140,248,0.4)] cursor-pointer transition-all"
                  >
                    ส่งกระดาษคำตอบและดูผลคะแนน ({answeredCount}/100 ข้อ)
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
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-300">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">ยืนยันการส่งข้อสอบ Pre-Test?</h3>
              <p className="text-sm text-white/65 leading-relaxed">
                คุณตอบคำถามไปแล้ว{' '}
                <span className="text-indigo-300 font-bold">
                  {answeredCount} จาก {totalQuestions} ข้อ
                </span>{' '}
                (ใช้เวลา {formatTime(elapsedSeconds)})
                {answeredCount < totalQuestions
                  ? ` ยังเหลืออีก ${totalQuestions - answeredCount} ข้อที่ยังไม่ได้เลือกคำตอบ`
                  : ' ครบทุกข้อเรียบร้อยแล้ว'}
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
                    <span className="font-mono font-bold text-indigo-300">
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
                className="flex-1 py-3.5 rounded-full bg-indigo-400 hover:bg-indigo-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(129,140,248,0.4)] cursor-pointer"
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
