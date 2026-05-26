'use client';
import { useRouter } from 'next/navigation';

export default function CourseSelection() {
  const router = useRouter();

  // รายการวิชาที่มีให้เลือก
  const subjects = [
    { id: 'physics', name: 'PHYSICS', color: 'from-blue-600 to-blue-400', icon: '⚛️' },
    { id: 'chemistry', name: 'CHEMISTRY', color: 'from-orange-600 to-orange-400', icon: '🧪' },
    { id: 'biology', name: 'BIOLOGY', color: 'from-green-600 to-green-400', icon: '🧬' },
    { id: 'math', name: 'MATHEMATICS', color: 'from-purple-600 to-purple-400', icon: '📐' }
  ];

  return (
    <main className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-6">
      {/* Header Section */}
      <div className="text-center mb-16 animate-in fade-in slide-in-from-top-8 duration-700">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4">
          Select <span className="text-blue-500">Course</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
          เลือกวิชาที่คุณต้องการเข้าเรียนเพื่อเริ่มบทเรียน
        </p>
      </div>

      {/* Subject Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => router.push(`/courses/${subject.id}`)}
            className="relative group overflow-hidden bg-zinc-900 border border-white/5 p-10 rounded-[2.5rem] transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-2xl"
          >
            {/* Background Gradient on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${subject.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col items-start">
                <span className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-500">{subject.icon}</span>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter group-hover:text-white transition-colors">
                  {subject.name}
                </h2>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-zinc-300">
                  Explore Lessons →
                </span>
              </div>
              
              {/* Arrow Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/10 group-hover:border-white/20 group-hover:bg-white/5 transition-all`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 group-hover:text-white transition-colors"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer Decoration */}
      <div className="mt-20 opacity-20">
        <span className="text-xs font-black tracking-[1em] uppercase italic">NJ Tutor Academy</span>
      </div>
    </main>
  );
}
```eof

### 🚀 ฟีเจอร์ของหน้านี้:
1.  **แยกวิชาชัดเจน**: มีปุ่มสำหรับ Physics, Chemistry, Biology และ Math พร้อมสีประจำวิชาที่ต่างกันครับ
2.  **Navigation**: เมื่อกดแล้วระบบจะพาไปที่หน้าวิชานั้นๆ ทันที (เช่น `/courses/physics`) ซึ่งเราจะทำเป็นหน้าเลือกบทเรียนในขั้นตอนถัดไปครับ
3.  **NJ Style Design**: ใช้ Font หนา เอียง (Black Italic) และมุมมนขนาดใหญ่ (Rounded 2.5rem) เพื่อให้เข้ากับส่วนอื่นๆ ของเว็บคุณ

**ขั้นตอนต่อไป:** คุณ Nitro อยากให้เมื่อกดเข้าไปในวิชาแล้ว แสดงรายการ "บทเรียน" (เช่น บทที่ 1, บทที่ 2) ในรูปแบบไหนดีครับ? เป็นรายการ List เรียบๆ หรือเป็น Card สวยๆ เหมือนหน้าเลือกวิชาดี?