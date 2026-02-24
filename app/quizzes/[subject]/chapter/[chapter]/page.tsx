'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
// 1. เปลี่ยนมาใช้ useSession จาก next-auth
import { useSession } from 'next-auth/react';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  
  // 2. ดึงข้อมูล Session (ที่เก็บชื่อ "ttt" เอาไว้)
  const { data: session, status } = useSession();
  
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // ดึงชื่อจาก Session มาใช้ ถ้ายังไม่โหลดให้ขึ้นว่า "กำลังตรวจสอบ..."
  const userName = session?.user?.name || "ผู้เยี่ยมชม";
  const userEmail = session?.user?.email || "GUEST";
  
  const [currentStartTime, setCurrentStartTime] = useState(Date.now());
  const SHEETS_URL = "https://script.google.com/macros/s/AKfycbyIODPty4xBGWygDDHs2HXiThMMYbSZO9w5HFun0thIKNtNelOsxpoX6GrYlQEBRGHf/exec"; 

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const q = query(
          collection(db, "quizzes"),
          where("subject", "==", params.subject),
          where("chapter", "==", parseInt(params.chapter as string))
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a: any, b: any) => (a.questionId || "").localeCompare(b.questionId || ""));
        setQuizzes(data);
      } catch (err) { 
        console.error("Fetch Error:", err); 
      } finally { 
        setLoading(false); 
      }
    };

    if (params.subject && params.chapter) fetchQuizzes();
  }, [params.subject, params.chapter]);

  const handleSubmitAnswer = async () => {
    if (!selectedOption) return;

    const timeSpent = (Date.now() - currentStartTime) / 1000;
    const currentQuiz = quizzes[currentIndex];
    const correctState = selectedOption === currentQuiz.correct;

    setIsCorrect(correctState);
    setIsAnswered(true);

    const payload = {
      // 3. ส่งชื่อจาก Session ไปที่ Sheets (ช่อง Owner จะกลายเป็น "ttt" ทันที)
      userId: userName, 
      subject: params.subject,
      chapter: params.chapter,
      attemptId: `ATT-${userEmail.split('@')[0]}-${Date.now()}`, 
      results: [{
        questionId: currentQuiz.questionId,
        userAnswer: selectedOption,
        isCorrect: correctState,
        timeSpent: timeSpent.toFixed(2)
      }]
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
      setCurrentStartTime(Date.now());
    } else {
      router.push('/');
    }
  };

  // รอโหลดทั้งข้อมูลข้อสอบและสถานะ Login
  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black italic animate-pulse text-xl text-blue-400 uppercase tracking-widest">Identifying Student...</p>
      </div>
    );
  }

  if (quizzes.length === 0) return <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center font-bold">ไม่พบข้อสอบในบทนี้</div>;

  const quiz = quizzes[currentIndex];

  return (
    <main className="min-h-screen bg-[#050507] text-white p-4 md:p-12 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full bg-zinc-900 border border-white/10 p-8 md:p-16 rounded-[3rem] shadow-2xl relative">
        <div className="flex justify-between items-center mb-10">
          <div>
            <span className="text-blue-500 font-black italic uppercase tracking-widest text-[10px] block mb-1">
              Student: {userName}
            </span>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              {params.subject} <span className="text-white/20">Ch.{params.chapter}</span>
            </h2>
          </div>
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5">
             <span className="text-xl font-mono font-bold text-blue-400">{currentIndex + 1} / {quizzes.length}</span>
          </div>
        </div>

        {quiz?.imageUrl && (
          <div className="mb-10 rounded-[2.5rem] overflow-hidden bg-white p-8 flex justify-center border-4 border-white/5">
            <img src={quiz.imageUrl} alt="Diagram" className="max-w-full h-auto max-h-[350px] object-contain" referrerPolicy="no-referrer" />
          </div>
        )}

        {/* ปรับขนาดตัวอักษรโจทย์ */}
        <div className="text-xl md:text-2xl leading-relaxed mb-10 font-bold text-zinc-100 whitespace-pre-line tracking-tight">
          {quiz?.questionText?.replace(/\[n\]/g, '\n')}
        </div>

        <div className="grid gap-4 mb-10">
          {['A', 'B', 'C', 'D', 'E'].map((opt) => (
            quiz?.[`option${opt}`] && (
              <button
                key={opt}
                disabled={isAnswered}
                onClick={() => setSelectedOption(opt)}
                className={`group p-6 rounded-[2rem] border transition-all duration-300 text-left flex items-center gap-6 ${
                  selectedOption === opt ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40' : 'bg-white/5 border-white/5 hover:bg-white/10'
                } ${isAnswered ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl font-black ${selectedOption === opt ? 'bg-white text-blue-600' : 'bg-zinc-800 text-zinc-500'}`}>{opt}</span>
                <span className={`text-xl font-medium ${selectedOption === opt ? 'text-white' : 'text-zinc-300'}`}>{quiz[`option${opt}`]}</span>
              </button>
            )
          ))}
        </div>

        <div className="flex flex-col items-center pt-8 border-t border-white/5 gap-4">
          {isAnswered && (
            <div className={`text-3xl font-black italic uppercase tracking-tighter mb-4 animate-in fade-in zoom-in duration-300 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? '✅ CORRECT!' : '❌ INCORRECT'}
            </div>
          )}

          {!isAnswered ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <button onClick={handleSubmitAnswer} disabled={!selectedOption} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-20 py-6 rounded-[2rem] font-black italic uppercase tracking-[0.2em] transition-all text-white">SUBMIT</button>
              <button onClick={handleNext} className="bg-white/5 hover:bg-white/10 border border-white/10 py-6 rounded-[2rem] font-black italic uppercase tracking-[0.2em] transition-all text-zinc-400">SKIP</button>
            </div>
          ) : (
            <button onClick={handleNext} className="w-full bg-white text-black py-6 rounded-[2rem] font-black italic uppercase tracking-[0.2em] transition-all">
              {currentIndex === quizzes.length - 1 ? 'FINISH' : 'NEXT QUESTION →'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
