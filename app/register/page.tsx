'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { ArrowLeft, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

function RegisterFormContent() {
  const [formData, setFormData] = useState({ userId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const cleanUserId = formData.userId.trim();
      const cleanPassword = formData.password.trim();

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cleanUserId,
          name: cleanUserId,
          email: '-',
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบอัตโนมัติ...');
        const loginRes = await signIn('credentials', {
          username: cleanUserId,
          password: cleanPassword,
          redirect: false,
        });

        if (loginRes?.ok) {
          if (callbackUrl.startsWith('/lessons/')) {
            window.location.href = callbackUrl;
          } else {
            router.push(callbackUrl);
            router.refresh();
          }
        } else {
          router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }
      } else {
        setErrorMsg(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        setLoading(false);
      }
    } catch (error) {
      console.error('Register Error:', error);
      setErrorMsg('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  return (
    <div className="z-10 w-full max-w-md p-8 sm:p-10 bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={callbackUrl}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
          <Sparkles className="w-3 h-3" />
          <span>Personal Smartboard Account</span>
        </span>
      </div>

      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent uppercase">
          Join NJ TUTOR
        </h2>
        <p className="text-white/50 text-xs leading-relaxed">
          สร้างบัญชีส่วนตัวเพื่อเก็บข้อมูลลายมือจดกระดานอัจฉริยะและประวัติการเรียนของคุณ
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider ml-2">
            User ID (ตั้งชื่อผู้ใช้งาน)
          </label>
          <input
            type="text"
            required
            value={formData.userId}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/60 transition-all text-orange-100"
            placeholder="เช่น student01 หรือชื่อเล่นของคุณ"
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider ml-2">
            Password (ตั้งรหัสผ่าน)
          </label>
          <input
            type="password"
            required
            value={formData.password}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500/60 transition-all text-orange-100"
            placeholder="••••••••"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl transition-all mt-2 cursor-pointer ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
          }`}
        >
          {loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิกและเข้าใช้งานทันที'}
        </button>
      </form>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-[#0a0a0c] px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          หรือ
        </span>
      </div>

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl })}
        className="w-full py-3.5 border border-white/15 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all text-xs font-bold text-gray-200 cursor-pointer"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
        CONTINUE WITH GOOGLE
      </button>

      <p className="text-center mt-7 text-xs font-medium text-gray-400">
        มีบัญชีอยู่แล้ว?{' '}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-orange-400 font-black hover:underline uppercase ml-1"
        >
          เข้าสู่ระบบ (Sign In)
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen w-full bg-[#0a0a0c] text-white flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 blur-[150px] rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-white/50 text-sm">Loading...</div>}>
        <RegisterFormContent />
      </Suspense>
    </main>
  );
}