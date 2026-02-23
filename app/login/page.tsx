'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  // เปลี่ยนจาก userId เป็น username เพื่อให้ตรงกับที่ NextAuth รอรับ (แก้ปัญหา undefined)
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 🚀 จุดสำคัญ: ต้องส่งชื่อเป็น username และ password เท่านั้น
    const result = await signIn('credentials', { 
      username: formData.username.trim(), 
      password: formData.password.trim(), 
      redirect: false 
    });

    if (result?.ok) {
      router.push('/');
      router.refresh();
    } else {
      setLoading(false);
      alert('User ID หรือ รหัสผ่านไม่ถูกต้องครับ');
    }
  };

  return (
    <main className="h-screen w-full bg-[#0a0a0c] text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full animate-pulse pointer-events-none"></div>

      <div className="z-10 w-full max-w-md p-10 bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center mb-10 gap-4">
          <div className="w-20 h-20 relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full"></div>
            <img src="/logo.png" alt="NJ Logo" className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
          </div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">Sign In</h2>
        </div>

        {/* Google Login */}
        <button 
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full py-4.5 bg-white text-black rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-8"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          CONTINUE WITH GOOGLE
        </button>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <span className="relative bg-[#0b0b0d] px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">OR USE ID</span>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <input 
            type="text" 
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 transition-all text-orange-100 outline-none"
            placeholder="User ID"
            // ตรวจสอบว่าใช้ username ตรงนี้ด้วย
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          <input 
            type="password" 
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 transition-all text-orange-100 outline-none"
            placeholder="Password"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-8 text-xs font-medium text-gray-500 uppercase tracking-tight">
          Don't have an account? <Link href="/register" className="text-orange-400 font-black hover:underline ml-1">Register</Link>
        </p>
      </div>
    </main>
  );
}