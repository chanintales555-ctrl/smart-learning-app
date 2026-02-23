'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubjectMenu() {
  const params = useParams();
  const router = useRouter();
  const subject = params.subject as string;

  // ข้อมูลบทเรียนทั้งหมด
  const allChapters: { [key: string]: { id: string, title: string }[] } = {
    chemistry: [
      { id: '1', title: 'ความปลอดภัยและทักษะในปฏิบัติการเคมี' },
      { id: '2', title: 'อะตอมและสมบัติของธาตุ' },
      { id: '3', title: 'พันธะเคมี' },
      { id: '4', title: 'โมลและสูตรเคมี' },
      { id: '5', title: 'สารละลาย' },
      { id: '6', title: 'ปริมาณสัมพันธ์' },
      { id: '7', title: 'แก๊สและสมบัติของแก๊ส' },
      { id: '8', title: 'อัตราการเกิดปฏิกิริยาเคมี' },
      { id: '9', title: 'สมดุลเคมี' },
      { id: '10', title: 'กรด-เบส' },
      { id: '11', title: 'ไฟฟ้าเคมี' },
      { id: '12', title: 'เคมีอินทรีย์' },
      { id: '13', title: 'พอลิเมอร์' },
    ],
    physics: [
      { id: '1', title: 'ธรรมชาติและพัฒนาการทางฟิสิกส์' },
      { id: '2', title: 'การเคลื่อนที่แนวตรง' },
      { id: '3', title: 'แรงและกฎการเคลื่อนที่' },
      { id: '4', title: 'สมดุลกล' },
      { id: '5', title: 'งานและพลังงาน' },
      { id: '6', title: 'โมเมนตัมและการชน' },
      { id: '7', title: 'การเคลื่อนที่แนวโค้ง' },
      { id: '8', title: 'การเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย' },
      { id: '9', title: 'คลื่น' },
      { id: '10', title: 'แสงเชิงคลื่น' },
      { id: '11', title: 'แสงเชิงรังสี' },
      { id: '12', title: 'เสียง' },
      { id: '13', title: 'ไฟฟ้าสถิต' },
      { id: '14', title: 'ไฟฟ้ากระแส' },
      { id: '15', title: 'แม่เหล็กและไฟฟ้า' },
      { id: '16', title: 'ความร้อนและแก๊ส' },
      { id: '17', title: 'ของแข็งและของไหล' },
      { id: '18', title: 'ฟิสิกส์อะตอม' },
      { id: '19', title: 'ฟิสิกส์นิวเคลียร์และฟิสิกส์อนุภาค' },
    ]
  };

  // ดึงบทเรียนตามวิชา ถ้าไม่เจอให้เป็นค่าว่าง
  const chapters = allChapters[subject.toLowerCase()] || [];

  return (
    <main className="min-h-screen bg-[#050507] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-blue-500 uppercase italic tracking-tighter">
            {subject} <span className="text-white/20">A-LEVEL</span>
          </h1>
          <div className="h-1 w-20 bg-blue-600 mt-2"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {chapters.map((chapter) => (
            <Link 
              key={chapter.id}
              href={`/quizzes/${subject}/chapter/${chapter.id}`}
              className="group flex items-center bg-white/5 border border-white/10 p-1 rounded-3xl hover:bg-blue-600/10 hover:border-blue-500/50 transition-all"
            >
              <div className="w-16 h-16 flex items-center justify-center bg-white/5 rounded-[1.4rem] text-2xl font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                {chapter.id.padStart(2, '0')}
              </div>
              <div className="ml-6 flex-1">
                <h3 className="text-lg font-bold text-gray-300 group-hover:text-white transition-all">
                  {chapter.title}
                </h3>
              </div>
              <div className="mr-6 opacity-0 group-hover:opacity-100 transition-all text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>

        <button 
          onClick={() => router.push('/admin')}
          className="mt-12 text-gray-500 hover:text-white text-sm transition-all"
        >
          ← Back to Admin
        </button>
      </div>
    </main>
  );
}