'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State สำหรับการจัดการคำตอบและเฉลย
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // ระบบเวลาและการบันทึก
  const [currentStartTime, setCurrentStartTime] = useState(Date.now());

  const USER_ID = "NITRO_USER"; // เปลี่ยนชื่อ User ตรงนี้ได้เลยครับ
  const SHEETS_URL = "https://script.google.com/macros/s/AKfycbyIODPty4xBGWygDDHs2HXiThMMYbSZO9w5HFun0thIKNtNelOsxpoX6GrYlQEBRGHf/exec"; 

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const q = query(
          collection(db, "quizzes"),
          where("subject", "==", params.subject),
          where("chapter", "==", parseInt(params.chapter as string))
        );
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
// บอก TypeScript ว่า a และ b เป็น any เพื่อให้มันยอมให้เข้าถึง questionId ได้
data.sort((a: any, b: any) => (a.questionId || "").localeCompare(b.questionId || ""));
        setQuizzes(data);
        
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (params.subject && params.chapter) fetchQuizzes();
  }, [params]);

  // ฟังก์ชันกดส่งคำตอบ (จุดที่หยุดเวลาและบันทึกข้อมูล)
  const handleSubmitAnswer = async () => {
    if (!selectedOption) return;

    // 1. หยุดเวลาทันทีที่กด Submit
    const timeSpent = (Date.now() - currentStartTime) / 1000;
    const currentQuiz = quizzes[currentIndex];
    const correctState = selectedOption === currentQuiz.correct;

    // 2. แสดงเฉลยบนหน้าจอ
    setIsCorrect(correctState);
    setIsAnswered(true);

    // 3. ส่งข้อมูลไป Google Sheets
    const singleResult = {
      questionId: currentQuiz.questionId,
      userAnswer: selectedOption,
      isCorrect: correctState,
      timeSpent: timeSpent.toFixed(2) // เวลาที่ใช้จนถึงตอนกดปุ่มนี้
    };

    const payload = {
      userId: USER_ID,
      subject: params.subject,
      chapter: params.chapter,
      attemptId: `ATT-${USER_ID}-${Date.now()}`, 
      results: [singleResult]
    };

    try {
      fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) { console.error("Sheet Error:", err); }
  };

  const handleNext = () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(null);
      setCurrentStartTime(Date.now()); // เริ่มนับเวลา 0 ใหม่สำหรับข้อถัดไป
    } else {
      alert("ทำครบทุกข้อแล้วครับ!");
      router.push('/');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center font-bold italic animate-pulse">LOADING...</div>;

  const quiz = quizzes[currentIndex];

  return (
    <main className="min-h-screen bg-[#050507] text-white p-4 md:p-12 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full bg-zinc-900 border border-white/10 p-8 md:p-16 rounded-[3rem] shadow-2xl relative">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <span className="text-blue-500 font-black italic uppercase tracking-widest text-[10px] block mb-1">User: {USER_ID}</span>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">
              {params.subject} <span className="text-white/20">Ch.{params.chapter}</span>
            </h2>
          </div>
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5">
             <span className="text-xl font-mono font-bold text-blue-400">{currentIndex + 1} / {quizzes.length}</span>
          </div>
        </div>

        {/* Image Display */}
        {quiz.imageUrl && (
          <div className="mb-10 rounded-[2.5rem] overflow-hidden bg-white p-8 flex justify-center border-4 border-white/5 shadow-2xl">
            <img src={quiz.imageUrl} alt="Diagram" className="max-w-full h-auto max-h-[350px] object-contain" referrerPolicy="no-referrer" />
          </div>
        )}

        {/* Question Text */}
        <div className="text-2xl md:text-3xl leading-relaxed mb-10 font-bold text-zinc-100 whitespace-pre-line tracking-tight">
          {quiz.questionText?.replace(/\[n\]/g, '\n')}
        </div>

        {/* Options Grid */}
        <div className="grid gap-4 mb-10">
          {['A', 'B', 'C', 'D', 'E'].map((opt) => (
            quiz[`option${opt}`] && (
              <button
                key={opt}
                disabled={isAnswered} // ล็อคปุ่มเมื่อกด Submit แล้ว
                onClick={() => setSelectedOption(opt)} // เปลี่ยนช้อยส์ได้เรื่อยๆ ก่อน Submit
                className={`group p-6 rounded-[2rem] border transition-all duration-300 text-left flex items-center gap-6 ${
                  selectedOption === opt 
                  ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
                } ${isAnswered ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl font-black transition-all ${
                  selectedOption === opt ? 'bg-white text-blue-600' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {opt}
                </span>
                <span className={`text-xl font-medium ${selectedOption === opt ? 'text-white' : 'text-zinc-300'}`}>
                  {quiz[`option${opt}`]}
                </span>
              </button>
            )
          ))}
        </div>

        {/* Footer: Submit & Feedback */}
        <div className="flex flex-col items-center pt-8 border-t border-white/5 gap-6">
          {isAnswered && (
            <div className={`text-4xl font-black italic uppercase tracking-tighter animate-in fade-in zoom-in duration-300 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? '✅ CORRECT!' : '❌ INCORRECT'}
            </div>
          )}

          {!isAnswered ? (
            <button 
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 py-6 rounded-[2rem] font-black italic uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/40"
            >
              SUBMIT ANSWER
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="w-full bg-white text-black hover:bg-zinc-200 py-6 rounded-[2rem] font-black italic uppercase tracking-[0.2em] transition-all"
            >
              {currentIndex === quizzes.length - 1 ? 'FINISH & VIEW SUMMARY' : 'NEXT QUESTION →'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}