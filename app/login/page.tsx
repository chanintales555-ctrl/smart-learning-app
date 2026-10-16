'use client';

import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

function LoginFormContent() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const result = await signIn('credentials', {
      username: formData.username.trim(),
      password: formData.password.trim(),
      redirect: false,
    });

    if (result?.ok) {
      if (callbackUrl.startsWith('/lessons/')) {
        window.location.href = callbackUrl;
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } else {
      setLoading(false);
      setErrorMsg('User ID หรือ รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งครับ');
    }
  };

  return (
    <div className="z-10 w-full max-w-md p-8 sm:p-10 bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl relative">
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
          <span>Cloud Note Sync</span>
        </span>
      </div>

      <div className="flex flex-col items-center mb-8 gap-3">
        <div className="w-20 h-20 relative">
          <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
          <img
            src="/logo.png"
            alt="NJ Logo"
            className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase">
          เข้าสู่ระบบ (Sign In)
        </h2>
        <p className="text-xs text-white/50 text-center">
          เข้าสู่ระบบเพื่อบันทึกและซิงก์ลายมือจดโน้ตบนกระดานอัจฉริยะแยกตามบัญชีของคุณ
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleCredentialsLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider ml-2">
            User ID (ชื่อผู้ใช้งาน)
          </label>
          <input
            type="text"
            required
            value={formData.username}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-orange-500/60 transition-all text-orange-100 outline-none"
            placeholder="กรอก User ID ของคุณ"
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider ml-2">
            Password (รหัสผ่าน)
          </label>
          <input
            type="password"
            required
            value={formData.password}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-orange-500/60 transition-all text-orange-100 outline-none"
            placeholder="กรอกรหัสผ่าน"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 mt-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] transition-all disabled:opacity-50 shadow-[0_0_25px_rgba(249,115,22,0.35)] cursor-pointer"
        >
          {loading ? 'กำลังตรวจสอบข้อมูล...' : 'เข้าสู่ระบบ (Sign In)'}
        </button>
      </form>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-[#0b0b0d] px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          หรือ
        </span>
      </div>

      {/* Google Login */}
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl })}
        className="w-full py-3.5 bg-white text-black rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
        CONTINUE WITH GOOGLE
      </button>

      <p className="text-center mt-7 text-xs font-medium text-gray-400">
        ยังไม่มีบัญชีผู้ใช้งาน?{' '}
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-orange-400 font-black hover:underline ml-1"
        >
          สมัครสมาชิกใหม่ (Register)
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-[#0a0a0c] text-white flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none" />
      <Suspense fallback={<div className="text-white/50 text-sm">Loading...</div>}>
        <LoginFormContent />
      </Suspense>
    </main>
  );
}