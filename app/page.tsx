import Image from "next/image";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#0f172a] text-white font-sans overflow-hidden">
      
      {/* --- LAYER 0: BACKGROUND (อยู่หลังสุดจริงๆ) --- */}
      <div className="fixed inset-0 z-0">
        {/* รูปพื้นหลังหลัก */}
        <Image 
          src="/Gemini_Generated_Image_pnm23qpnm23qpnm2.png" 
          alt="Background"
          fill
          className="object-cover opacity-40" // ปรับ opacity ได้ตามใจชอบ (0-100)
          priority 
        />
        {/* Overlay สีดำทับอีกชั้นเพื่อให้ตัวหนังสืออ่านง่ายและดูขรึม */}
        <div className="absolute inset-0 bg-black/50"></div>
        
        {/* ลายตารางกริด (Grid) เพิ่มมิติแบบแนววิทยาศาสตร์ */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ 
            backgroundImage: `linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)`, 
            backgroundSize: '40px 40px' 
          }}
        ></div>
      </div>

      {/* --- LAYER 1: FOREGROUND (ส่วนเนื้อหาที่ทับข้างหน้าทั้งหมด) --- */}
      <div className="relative z-10">
        
        {/* --- Navbar --- */}
        <nav className="bg-gradient-to-r from-red-600 to-orange-500 p-4 shadow-2xl relative z-20">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <Image 
                  src="/Gemini_Generated_Image_kofvl3kofvl3kofv-Photoroom.png" 
                  alt="NJ Tutor Logo" 
                  fill 
                  className="object-contain"
                />
              </div>
              <span className="text-3xl font-black tracking-tighter">NJ TUTOR</span>
            </div>
            
<div className="hidden md:flex gap-4 font-bold items-center">
  {/* เมนู: สรุปเนื้อหา */}
  <a href="#" className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95">
    สรุปเนื้อหา
  </a>

  {/* เมนู: แบบทดสอบรายบท */}
  <a href="#" className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95">
    แบบทดสอบรายบท
  </a>

  {/* เมนู: ลงชื่อเข้าใช้งาน (ทำให้เด่นกว่าอันอื่น) */}
  <a href="#" className="ml-2 px-6 py-2 rounded-full bg-white text-orange-600 border border-white transition-all duration-300 hover:bg-orange-50 hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95">
    ลงชื่อเข้าใช้งาน
  </a>
</div>
          </div>
        </nav>

        {/* --- Hero Section --- */}
        <section className="max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center min-h-[calc(100vh-112px)]">
          
          {/* ฝั่งข้อความคำคม */}
          <div className="md:w-1/2 z-10">
            <h2 className="text-5xl md:text-7xl font-serif text-red-500 italic mb-8 drop-shadow-lg leading-tight">
              “I have learned more from my mistakes than from my successes”
            </h2>
            <p className="text-2xl text-gray-300 font-light">— Sir Humphry Davy</p>
            <button className="mt-10 bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full font-black text-xl transition-all hover:scale-105 shadow-[0_10px_20px_rgba(249,115,22,0.3)]">
              เริ่มเรียนรู้ตอนนี้
            </button>
          </div>

          {/* ฝั่งรูปภาพนักวิทยาศาสตร์ */}
          <div className="md:w-1/2 flex justify-center mt-12 md:mt-0 relative">
            {/* แสง Glow หลังรูปนักวิทย์ */}
            <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full"></div>
            
            <div className="relative w-80 h-[450px] md:w-[450px] md:h-[550px]">
              <Image 
                src="/Sir_Humphry_Davy,_Bt_by_Thomas_Phillips.jpg" 
                alt="Scientist Portrait" 
                fill 
                className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
              />
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}