import React from 'react';
import { Check, Star, Crown, Zap, Sparkles } from 'lucide-react';

const SubscriptionSection: React.FC = () => {
  const plans = [
    { 
      name: 'مجاني', 
      price: '0', 
      features: ['مشاهدة محدودة', 'بحث أساسي', 'رسالة واحدة يومياً'],
      icon: <Zap className="w-6 h-6" />,
      color: 'from-slate-600 to-slate-700',
      bgColor: 'bg-slate-800/30',
      borderColor: 'border-slate-600/50',
      popular: false,
      description: 'ابدأ رحلتك مجاناً'
    },
    { 
      name: 'أساسي', 
      price: '199', 
      features: ['مشاهدة غير محدودة', 'بحث متقدم', 'رسائل غير محدودة', 'إخفاء الإعلانات'],
      icon: <Check className="w-6 h-6" />,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-600/50',
      popular: false,
      description: 'للاستخدام اليومي'
    },
    { 
      name: 'مميز', 
      price: '399', 
      features: ['جميع مميزات الأساسي', 'معرفة من أعجب بك', 'إشارة مميزة', 'أولوية في النتائج'],
      icon: <Star className="w-6 h-6" />,
      color: 'from-purple-600 to-purple-700',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-500/50',
      popular: true,
      description: 'الأكثر شعبية'
    },
    { 
      name: 'VIP', 
      price: '799', 
      features: ['جميع المميزات', 'دعم مخصص', 'شارة VIP ذهبية', 'ظهور في المقدمة دائماً'],
      icon: <Crown className="w-6 h-6" />,
      color: 'from-amber-600 to-yellow-600',
      bgColor: 'bg-amber-900/20',
      borderColor: 'border-amber-500/50',
      popular: false,
      description: 'تجربة استثنائية'
    },
  ];

  return (
    <div className="py-16 md:py-24 bg-gradient-to-br from-gray-900/40 via-slate-800/20 to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-seductive-text mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-seductive-accent" />
            اختر خطتك المناسبة
            <Sparkles className="w-8 h-8 text-seductive-accent" />
          </h2>
          <p className="text-xl text-seductive-text/70 max-w-2xl mx-auto">
            احصل على أفضل تجربة في البحث عن شريك الحياة مع خططنا المتنوعة
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative group transition-all duration-500 hover:scale-105 ${
                plan.popular ? 'lg:-mt-8' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-bold py-2 px-6 rounded-full shadow-lg animate-pulse border border-purple-400/50">
                    ⭐ الأكثر شعبية
                  </div>
                </div>
              )}
              
              {/* Free Badge */}
              {index === 0 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm font-bold py-2 px-6 rounded-full shadow-lg border border-slate-400/50">
                    🎁 مجاني
                  </div>
                </div>
              )}
              
              {/* VIP Badge */}
              {index === 3 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-sm font-bold py-2 px-6 rounded-full shadow-lg border border-amber-400/50">
                    👑 VIP
                  </div>
                </div>
              )}

              <div
                className={`relative overflow-hidden ${plan.bgColor} backdrop-blur-sm border-2 ${plan.borderColor} rounded-2xl p-8 shadow-2xl transition-all duration-500 group-hover:shadow-3xl bg-gray-900/40 ${
                  plan.popular ? 'ring-2 ring-purple-500/50 shadow-purple-500/20' : ''
                }`}
              >
                {/* Dark Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-10 group-hover:opacity-15 transition-opacity duration-500`}></div>
                
                {/* Icon */}
                <div className={`relative w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-lg border border-white/20`}>
                  {plan.icon}
                </div>
                
                {/* Plan Name */}
                <h3 className="relative text-2xl font-bold text-seductive-text mb-2 text-center">{plan.name}</h3>
                
                {/* Description */}
                <p className="relative text-seductive-text/60 text-center mb-6 text-sm">{plan.description}</p>
                
                {/* Price */}
                <div className="relative text-center mb-8">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-seductive-text">{plan.price}</span>
                    <span className="text-lg text-seductive-text/70 mr-2">جنيه</span>
                  </div>
                  <span className="text-seductive-text/50">/شهر</span>
                </div>
                
                {/* Features */}
                <ul className="relative space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-seductive-text/80">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mr-3 flex-shrink-0 border border-white/20`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* Button */}
                <button
                  className={`relative w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-to-r ${plan.color} hover:shadow-2xl border border-white/10 ${
                    plan.popular ? 'animate-pulse-glow' : ''
                  }`}
                >
                  {index === 0 ? '🚀 ابدأ مجاناً' : plan.popular ? '⭐ اختر الأفضل' : '✨ اختر هذه الخطة'}
                </button>
                
                {/* Dark Decorative Elements */}
                <div className={`absolute top-4 right-4 w-20 h-20 bg-gradient-to-br ${plan.color} opacity-10 rounded-full blur-xl`}></div>
                <div className={`absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br ${plan.color} opacity-5 rounded-full blur-lg`}></div>
                
                {/* Subtle border glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${plan.color} opacity-20 blur-sm -z-10 group-hover:opacity-30 transition-opacity duration-500`}></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Trust Indicators */}
        <div className="text-center mt-16">
          <div className="flex flex-wrap items-center justify-center gap-8 text-seductive-text/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
              <span className="text-sm">آمن ومضمون</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm">إلغاء في أي وقت</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm">دعم فني متاح 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSection;
