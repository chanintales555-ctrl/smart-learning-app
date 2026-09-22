'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Lenis from 'lenis';
import { 
  ArrowLeft, 
  ArrowRight, 
  FlaskConical, 
  Layers, 
  GraduationCap, 
  Clock, 
  Sparkles,
  ChevronDown,
  Atom,
  CheckCircle2,
  Box
} from 'lucide-react';

// Dynamic import for the 3D Chemistry Course Canvas
const ChemistryCourseCanvas = dynamic(
  () => import('@/components/canvas/ChemistryCourseCanvas'),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-[#030306]" />,
  }
);

// All 13 Chemistry Chapters according to Thai A-Level Curriculum
const chemistryChapters = [
  {
    id: '1',
    title: 'ความปลอดภัยและทักษะในปฏิบัติการเคมี',
    engTitle: 'Lab Safety & Chemistry Techniques',
    cluster: 'FOUNDATION',
    desc: 'อุปกรณ์วิทยาศาสตร์ ความปลอดภัยในการใช้สารเคมี การปฐมพยาบาลเบื้องต้น และการวัดบันทึกผลตามหลักสากล',
    modelLabel: '3D Apparatus & Glassware',
  },
  {
    id: '2',
    title: 'อะตอมและสมบัติของธาตุ',
    engTitle: 'Atomic Structure & Periodic Properties',
    cluster: 'ATOMIC PHYSICS',
    desc: 'แบบจำลองอะตอม โครงสร้างอนุภาคมูลฐาน โปรตอน นิวตรอน อิเล็กตรอน การจัดเรียงอิเล็กตรอน และแนวโน้มตารางธาตุ',
    modelLabel: '3D Bohr Shell & Quantum Orbitals',
  },
  {
    id: '3',
    title: 'พันธะเคมี',
    engTitle: 'Chemical Bonding & Molecular Geometry',
    cluster: 'BONDING',
    desc: 'พันธะไอออนิก โควาเลนต์ โลหะ แรงยึดเหนี่ยวระหว่างโมเลกุล รูปร่างโมเลกุล VSEPR และสภาพขั้ว',
    modelLabel: '3D Crystalline Lattice & Bonds',
  },
  {
    id: '4',
    title: 'โมลและสูตรเคมี',
    engTitle: 'Mole Concept & Chemical Formulas',
    cluster: 'STOICHIOMETRY',
    desc: 'มวลอะตอม เลขอะโวกาโดร มวลโมเลกุล ความสัมพันธ์ระหว่างโมล สูตรเอมพิริคัล และสูตรโมเลกุล',
    modelLabel: '3D Stoichiometric Unit Cells',
  },
  {
    id: '5',
    title: 'สารละลาย',
    engTitle: 'Solutions & Concentration Dynamics',
    cluster: 'SOLUTIONS',
    desc: 'หน่วยความเข้มข้น การเตรียมสารละลาย การเจือจาง และสมบัติคอลลิเกทีฟของสารละลาย',
    modelLabel: '3D Solvation & Hydration Shells',
  },
  {
    id: '6',
    title: 'ปริมาณสัมพันธ์',
    engTitle: 'Reaction Stoichiometry',
    cluster: 'REACTIONS',
    desc: 'สมการเคมี สารกำหนดปริมาณ ผลได้ร้อยละ และการคำนวณปริมาณสารในปฏิกิริยาเคมีหลายขั้นตอน',
    modelLabel: '3D Reaction Kinetic Matrix',
  },
  {
    id: '7',
    title: 'แก๊สและสมบัติของแก๊ส',
    engTitle: 'Gas Laws & Kinetic Molecular Theory',
    cluster: 'GAS LAWS',
    desc: 'กฎของบอยล์ ชาร์ล เกย์-ลูสแซก กฎรวมแก๊ส กฎแก๊สสมบูรณ์แบบ ทฤษฎีจลน์ และการแพร่ของแก๊ส',
    modelLabel: '3D Kinetic Gas Chamber',
  },
  {
    id: '8',
    title: 'อัตราการเกิดปฏิกิริยาเคมี',
    engTitle: 'Chemical Kinetics & Reaction Rates',
    cluster: 'KINETICS',
    desc: 'ทฤษฎีการชน พลังงานก่อกัมมันต์ (Ea) กฎอัตรา กลไกการเกิดปฏิกิริยา และตัวเร่งปฏิกิริยา',
    modelLabel: '3D Collision Energy Barrier',
  },
  {
    id: '9',
    title: 'สมดุลเคมี',
    engTitle: 'Chemical Equilibrium & Le Chatelier',
    cluster: 'EQUILIBRIUM',
    desc: 'ภาวะสมดุลไดนามิก ค่าคงที่สมดุล (K) หลักของเลอชาเตอลิเยร์ และการรบกวนสมดุลในอุตสาหกรรม',
    modelLabel: '3D Reversible Dynamic Flux',
  },
  {
    id: '10',
    title: 'กรด-เบส',
    engTitle: 'Acids, Bases & pH Equilibrium',
    cluster: 'ACIDS & BASES',
    desc: 'ทฤษฎีกรด-เบส การแตกตัวของกรดแก่-เบสแก่และกรดอ่อน ค่า pH สารละลายบัฟเฟอร์ และการไทเทรต',
    modelLabel: '3D Hydronium Proton Transfer',
  },
  {
    id: '11',
    title: 'ไฟฟ้าเคมี',
    engTitle: 'Electrochemistry & Redox Cells',
    cluster: 'ELECTROCHEMISTRY',
    desc: 'ปฏิกิริยารีดอกซ์ การดุลสมการรีดอกซ์ ศักย์ไฟฟ้ามาตรฐาน (E°) เซลล์กัลวานิก และเซลล์อิเล็กโทรไลต์',
    modelLabel: '3D Galvanic Redox Electrodes',
  },
  {
    id: '12',
    title: 'เคมีอินทรีย์',
    engTitle: 'Organic Chemistry & Functional Groups',
    cluster: 'ORGANIC',
    desc: 'สารประกอบไฮโดรคาร์บอน แอลเคน แอลคีน แอลไคน์ อะโรมาติก หมู่ฟังก์ชัน ไอโซเมอร์ และปฏิกิริยาเคมีอินทรีย์',
    modelLabel: '3D Aromatic Benzene Pi-Ring',
  },
  {
    id: '13',
    title: 'พอลิเมอร์',
    engTitle: 'Polymers & Macromolecules',
    cluster: 'MACROMOLECULES',
    desc: 'ปฏิกิริยาพอลิเมอไรเซชัน โครงสร้างและสมบัติของพอลิเมอร์ พลาสติก ยาง เส้นใย และการรีไซเคิล',
    modelLabel: '3D Cross-Linked Polymer Network',
  },
];

export default function ChemistryCoursePage() {
  const router = useRouter();
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

  // Compute active chapter index (1 - 13)
  const activeChapterIndex = Math.min(
    13,
    Math.max(1, Math.floor(scrollProgress * 13) + 1)
  );

  return (
    <div ref={containerRef} className="relative bg-[#030306] text-white min-h-[1400vh] selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* 3D Scrollytelling Background */}
      <ChemistryCourseCanvas scrollProgress={scrollProgress} />

      {/* Top Hairline Progress */}
      <div className="fixed top-0 left-0 w-full h-[2px] z-50 bg-white/[0.06]">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-all duration-75"
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
          <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/[0.08] text-xs font-mono uppercase text-emerald-400 tracking-wider">
            <FlaskConical className="w-4 h-4" />
            <span>Chemistry A-Level · Course Curriculum</span>
          </div>
        </div>

        {/* Right Active Chapter Counter */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-3xl px-4 py-2 rounded-full border border-white/[0.1] shadow-2xl">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Chapter</span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {String(activeChapterIndex).padStart(2, '0')} / 13
            </span>
          </div>
          <Link
            href="/quizzes/chemistry"
            className="hidden sm:inline-flex px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            All Quizzes
          </Link>
        </div>
      </header>

      {/* Floating Side Track Index */}
      <div className="fixed right-10 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-end gap-3 pointer-events-none">
        {chemistryChapters.map((ch, idx) => {
          const isActive = activeChapterIndex === idx + 1;
          return (
            <div key={ch.id} className="flex items-center gap-3 transition-all duration-300">
              <span className={`text-[10px] font-mono tracking-wider transition-all duration-300 ${
                isActive ? 'text-emerald-400 font-bold opacity-100' : 'text-white/20 opacity-30'
              }`}>
                {String(idx + 1).padStart(2, '0')} {ch.engTitle.split(' ')[0]}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isActive ? 'bg-emerald-400 scale-150 shadow-[0_0_8px_rgba(16,185,129,0.9)]' : 'bg-white/20'
              }`} />
            </div>
          );
        })}
      </div>

      {/* Intro Hero Screen */}
      <section className="h-screen w-full flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/[0.1] border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-mono tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Interactive 3D Curriculum Explorer</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-none">
              CHEMISTRY <span className="text-white/30 font-light">COURSE</span>
            </h1>
            <p className="text-lg sm:text-xl font-light text-white/70 max-w-2xl mx-auto leading-relaxed">
              สำรวจโครงสร้างเคมี 13 บทเรียน ครอบคลุมเนื้อหา A-Level อย่างเจาะลึก เลื่อนเมาส์เพื่อเดินทางผ่านโมเดล 3D ประจำแต่ละบท
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3 text-xs font-mono text-white/40">
            <span>13 CHAPTERS</span>
            <span>·</span>
            <span>3D VISUALIZATIONS</span>
            <span>·</span>
            <span>EXAM QUIZZES</span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <span className="text-xs font-mono uppercase tracking-[0.3em]">Scroll to inspect chapters</span>
          <ChevronDown className="w-5 h-5 text-emerald-400" />
        </div>
      </section>

      {/* 13 Chapter Presentation Stages */}
      {chemistryChapters.map((chapter, idx) => {
        const isEven = idx % 2 === 0;

        return (
          <section
            key={chapter.id}
            className={`h-screen w-full flex items-center px-6 md:px-24 relative z-10 ${
              isEven ? 'justify-start' : 'justify-end'
            }`}
          >
            <div className="max-w-xl md:max-w-2xl bg-black/40 backdrop-blur-3xl border border-white/[0.1] hover:border-emerald-500/40 p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.7)] relative group transition-all duration-500">
              {/* Subtle Card Glow */}
              <div className="absolute -top-10 -left-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-[70px] pointer-events-none" />

              <div className="space-y-6 relative z-10">
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/[0.1] border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-wider uppercase">
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>CHAPTER {String(idx + 1).padStart(2, '0')} · {chapter.cluster}</span>
                  </div>

                  {/* Telemetry label for 3D model */}
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                    <Box className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{chapter.modelLabel}</span>
                  </div>
                </div>

                {/* Chapter Title */}
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                    {chapter.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-mono text-white/40 uppercase tracking-widest">
                    {chapter.engTitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-white/70 text-sm md:text-base leading-relaxed">
                  {chapter.desc}
                </p>

                {/* Status & Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5">
                  {/* Direct Quiz Button */}
                  <Link
                    href={`/quizzes/chemistry/chapter/${chapter.id}`}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    <span>ทำข้อสอบบทนี้</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {/* Coming Soon Lesson Badge */}
                  <div className="w-full sm:w-auto px-5 py-3 rounded-full bg-white/[0.04] border border-white/[0.1] text-white/60 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>เนื้อหาบทเรียนกำลังจัดทำ</span>
                  </div>
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
              COMPLETE CHEMISTRY SYLLABUS
            </h2>
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto">
              ครอบคลุมครบถ้วน 13 บทเรียน ทั้งพาร์ทคำนวณและพาร์ทบรรยายตามแนวข้อสอบ A-Level
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/quizzes/chemistry"
              className="px-8 py-4.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm sm:text-base tracking-wider uppercase transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
              คลังข้อสอบเคมีทั้งหมด
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
