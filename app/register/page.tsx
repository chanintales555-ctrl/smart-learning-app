'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ส่งข้อมูลไปที่ API หลังบ้าน (จะบันทึกลง Google Sheets)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.userId,    // ใช้ User ID เป็นชื่อใน Google Sheets
          email: "-",               // สาย User/Pass จะไม่มี Email
          password: formData.password
        }),
      });

      if (res.ok) {
        alert("สมัครสมาชิกสำเร็จ! ข้อมูลของคุณถูกบันทึกแล้ว");
        router.push('/login');
      } else {
        const errorData = await res.json();
        alert("เกิดข้อผิดพลาด: " + errorData.error);
      }
    } catch (error) {
      console.error("Register Error:", error);
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen w-full bg-[#0a0a0c] text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="z-10 w-full max-w-md p-10 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent uppercase">
            Join NJ TUTOR
          </h2>
          <p className="text-gray-500 text-sm font-light uppercase tracking-widest text-[10px]">Create your ID & Password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">User ID</label>
            <input 
              type="text" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500/50 transition-all text-orange-100"
              placeholder="ตั้งชื่อผู้ใช้งาน"
              onChange={(e) => setFormData({...formData, userId: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500/50 transition-all text-orange-100"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl font-black text-lg shadow-xl transition-all mt-4 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
          >
            {loading ? 'WAIT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <span className="relative bg-[#0a0a0c] px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">OR USE EMAIL</span>
        </div>

        {/* ปุ่ม Google: กดครั้งแรก = สมัคร / ครั้งต่อไป = ล็อกอิน */}
        <button 
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full py-4 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all text-sm font-bold text-gray-300"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          CONTINUE WITH GOOGLE
        </button>

        <p className="text-center mt-10 text-xs font-medium text-gray-500">
          Already have an account? <Link href="/login" className="text-orange-400 font-black hover:underline uppercase ml-1">Sign In</Link>
        </p>
      </div>
    </main>
  );
}