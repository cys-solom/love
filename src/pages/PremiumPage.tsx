
import React from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';

const PremiumPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-seductive-bg-start via-seductive-bg-middle to-seductive-bg-end text-seductive-text">
      <Crown size={80} className="text-yellow-400 mb-6 animate-pulse-glow" />
      <h1 className="text-4xl md:text-5xl font-bold mb-4 font-tajawal">
        مرحباً بك في العضوية المميزة!
      </h1>
      <p className="text-xl md:text-2xl mb-8 font-tajawal max-w-2xl">
        لقد تم فتح الوصول الكامل! استمتع بميزات حصرية وابدأ في تكوين علاقات ذات معنى.
        الآن يمكنك رؤية المزيد من الملفات الشخصية والتفاعل بحرية.
      </p>
      <img 
        src={`https://source.unsplash.com/random/600x400?celebration,luxury&cache_bust=${Math.random()}`}
        alt="Premium Celebration"
        className="rounded-lg shadow-xl max-w-md w-full mb-8 filter grayscale hover:grayscale-0 transition-all duration-300"
      />
      <Link
        to="/"
        className="bg-seductive-accent text-white font-bold py-3 px-8 rounded-lg hover:bg-seductive-accent-hover transition-colors duration-300 text-lg font-tajawal"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  );
};

export default PremiumPage;
