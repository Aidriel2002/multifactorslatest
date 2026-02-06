import { useState, useEffect, useRef, useCallback } from 'react';
import logo from '../images/MFlogo.png';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import './HeroSection.css';

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = '', direction = 'up' }) {
  const [ref, visible] = useScrollReveal(0.12);
  const translate =
    direction === 'up'    ? 'translateY(48px)'  :
    direction === 'down'  ? 'translateY(-48px)' :
    direction === 'left'  ? 'translateX(48px)'  :
    direction === 'right' ? 'translateX(-48px)' : 'translateY(48px)';
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0)' : translate,
        transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const slides = [
  {
    id: 1,
    type: 'unv-cctv',
    content: {
      brand: "UNV",
      title: "Professional CCTV Systems",
      subtitle: "Your security isn't our experiment.",
      description: "Industry-leading UNV cameras with advanced AI analytics, crystal-clear 4K resolution, and intelligent video management",
      features: [],
      specs: []
    },
    style: { accentBg: 'bg-blue-900', logoStyle: 'border-2 border-green-500 shadow-lg shadow-green-200', showLogo: true, logoPosition: 'top-left' }
  },
  {
    id: 2,
    type: 'smart-door-lock',
    content: {
      title: "Smart Door Lock",
      subtitle: "Confidence built into every lock and lens.",
      tagline: "If it's not good enough for us, it's not for sale.",
      description: "Advanced biometric door locks with fingerprint, PIN, card, and mobile app access. Never worry about lost keys again.",
      benefits: [],
      features: []
    },
    style: { accentBg: 'bg-yellow-500', showLogo: false }
  },
  {
    id: 3,
    type: 'networking',
    content: {
      title: "Networking Solutions",
      subtitle: "Designed for uptime.",
      description: "Complete networking solutions including routers, switches, access points, and structured cabling for businesses of all sizes",
      services: [],
      stats: []
    },
    style: { accentBg: 'bg-green-600', logoStyle: 'border-2 border-green-500 shadow-lg shadow-green-200', showLogo: true, logoPosition: 'top-right' }
  }
];

const HeroSection = () => {
  const sectionRef = useRef(null);

  const [loaded, setLoaded]           = useState(false);
  const [showBrand, setShowBrand]     = useState(false);
  const [showTitle, setShowTitle]     = useState(false);
  const [showDesc,  setShowDesc]      = useState(false);
  const [showCards, setShowCards]     = useState(false);
  const [showSpecs, setShowSpecs]     = useState(false);

  const [currentSlide, setCurrentSlide]     = useState(0);
  const [isAutoPlaying, setIsAutoPlaying]  = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setLoaded(true),   200);
    const t2 = setTimeout(() => setShowBrand(true), 500);
    const t3 = setTimeout(() => setShowTitle(true), 900);
    const t4 = setTimeout(() => setShowDesc(true),  1300);
    const t5 = setTimeout(() => setShowCards(true), 1700);
    const t6 = setTimeout(() => setShowSpecs(true), 2100);
    return () => [t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Reset all animation states
    const resetAnimations = () => {
      setShowBrand(false);
      setShowTitle(false);
      setShowDesc(false);
      setShowCards(false);
      setShowSpecs(false);
    };
    
    resetAnimations();
    
    const t1 = setTimeout(() => setShowBrand(true), 150);
    const t2 = setTimeout(() => setShowTitle(true), 350);
    const t3 = setTimeout(() => setShowDesc(true),  550);
    const t4 = setTimeout(() => setShowCards(true), 750);
    const t5 = setTimeout(() => setShowSpecs(true), 950);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [currentSlide]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const pauseAutoplay = useCallback(() => {
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 15000);
  }, []);

  const goToSlide = (i)  => { setCurrentSlide(i);                                            pauseAutoplay(); };
  const nextSlide = ()    => { setCurrentSlide(p => (p + 1) % slides.length);                 pauseAutoplay(); };
  const prevSlide = ()    => { setCurrentSlide(p => (p - 1 + slides.length) % slides.length); pauseAutoplay(); };

  const fadeIn = (flag, extraDelay = 0) => ({
    opacity:   flag ? 1 : 0,
    transform: flag ? 'translateY(0)' : 'translateY(36px)',
    transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${extraDelay}ms, transform 0.7s cubic-bezier(.22,1,.36,1) ${extraDelay}ms`,
  });

  const scaleIn = (flag, extraDelay = 0) => ({
    opacity:   flag ? 1 : 0,
    transform: flag ? 'scale(1)' : 'scale(0.88)',
    transition: `opacity 0.6s cubic-bezier(.22,1,.36,1) ${extraDelay}ms, transform 0.6s cubic-bezier(.22,1,.36,1) ${extraDelay}ms`,
  });

  const renderSlide1 = (s) => (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative">
      {s.style.showLogo && (
        <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-20" style={scaleIn(loaded)}>
          <img src={logo} alt="Logo" className={`h-12 sm:h-16 md:h-20 w-auto ${s.style.logoStyle} rounded-lg bg-white`} />
        </div>
      )}
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="text-center mb-4 sm:mb-6" style={scaleIn(showBrand)}>
          <div className={`inline-block px-4 sm:px-6 py-2 sm:py-3 ${s.style.accentBg} rounded-lg shadow-lg shadow-green-200`}>
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-wider">{s.content.brand}</span>
          </div>
        </div>
        <div className="text-center mb-6 sm:mb-8" style={fadeIn(showTitle)}>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-2 sm:mb-4">
            <span className="text-gray-900">Closed-Circuit Television</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-blue-600 font-semibold px-4">{s.content.subtitle}</p>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 text-center max-w-3xl mx-auto mb-8 sm:mb-12 px-4 leading-relaxed" style={fadeIn(showDesc)}>
          {s.content.description}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12 px-4">
          {s.content.features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} style={scaleIn(showCards, idx * 100)}>
                <Reveal delay={idx * 80} direction="up">
                  <div className="bg-white/70 backdrop-blur-sm border border-green-200 rounded-xl p-4 sm:p-6 hover:border-green-500 hover:shadow-lg hover:shadow-green-200 transition-all duration-300 hover:-translate-y-2">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${s.style.accentBg} flex items-center justify-center mb-3 sm:mb-4 mx-auto shadow-md shadow-green-200`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold text-center">{feature.text}</p>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 px-4" style={fadeIn(showSpecs)}>
          {s.content.specs.map((spec, idx) => (
            <div key={idx} className="text-center w-full sm:w-auto">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{spec.value}</div>
              <div className="text-xs sm:text-sm text-gray-500">{spec.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSlide2 = (s) => (
    <div className="min-h-screen flex items-center px-4 sm:px-6 lg:px-8 py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="text-center mb-4 sm:mb-6" style={scaleIn(showBrand)}>
          <span className={`inline-block px-4 sm:px-6 py-2 ${s.style.accentBg} text-white text-xs sm:text-sm font-bold rounded-full shadow-md shadow-green-200`}>
            {s.content.tagline}
          </span>
        </div>
        <div className="text-center mb-6 sm:mb-8" style={fadeIn(showTitle)}>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black mb-2 sm:mb-4">
            <span className="text-gray-900">Lock<span className=' text-yellow-500'>tech</span></span><br />
            <span className="text-gray-900">Smart Door Lock</span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-500 px-4">{s.content.subtitle}</p>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 text-center max-w-3xl mx-auto mb-8 sm:mb-12 px-4 leading-relaxed" style={fadeIn(showDesc)}>
          {s.content.description}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 px-4">
          {s.content.benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div key={idx} style={scaleIn(showCards, idx * 120)}>
                <Reveal delay={idx * 100} direction="up">
                  <div className="bg-white/70 backdrop-blur-sm border border-green-200 rounded-2xl p-6 sm:p-8 hover:border-green-500 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-200">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl ${s.style.accentBg} flex items-center justify-center mb-4 mx-auto shadow-lg shadow-green-200`}>
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-2">{benefit.title}</h3>
                    <p className="text-sm sm:text-base text-gray-500 text-center">{benefit.desc}</p>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto px-4" style={fadeIn(showSpecs)}>
          {s.content.features.map((feature, idx) => (
            <Reveal key={idx} delay={idx * 70} direction="left">
              <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-green-200 rounded-lg p-3 sm:p-4 hover:border-green-500 hover:bg-white/90 transition-all duration-300">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                <span className="text-sm sm:text-base text-gray-800 font-medium">{feature}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSlide3 = (s) => (
    <div className="min-h-screen flex items-center px-4 sm:px-6 lg:px-8 py-20 relative">
      {s.style.showLogo && (
        <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-20" style={scaleIn(loaded)}>
          <img src={logo} alt="Logo" className={`h-12 sm:h-16 md:h-20 w-auto ${s.style.logoStyle} rounded-lg bg-white`} />
        </div>
      )}
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="text-center mb-6 sm:mb-8" style={fadeIn(showTitle)}>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-2 sm:mb-4">
            <span className="text-gray-900">Networking Solutions</span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-green-600 font-semibold px-4">{s.content.subtitle}</p>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 text-center max-w-3xl mx-auto mb-8 sm:mb-12 px-4 leading-relaxed" style={fadeIn(showDesc)}>
          {s.content.description}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 px-4">
          {s.content.services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <div key={idx} style={scaleIn(showCards, idx * 130)}>
                <Reveal delay={idx * 90} direction="up">
                  <div className="bg-white/70 backdrop-blur-sm border-2 border-green-200 rounded-2xl p-6 sm:p-8 hover:border-green-500 hover:shadow-lg hover:shadow-green-200 transition-all duration-300 hover:-translate-y-2">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${s.style.accentBg} flex items-center justify-center mb-4 mx-auto shadow-lg shadow-green-200`}>
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-4">{service.title}</h3>
                    <ul className="space-y-2">
                      {service.points.map((point, pidx) => (
                        <li key={pidx} className="flex items-center gap-2 text-sm sm:text-base text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto px-4" style={fadeIn(showSpecs)}>
          {s.content.stats.map((stat, idx) => (
            <Reveal key={idx} delay={idx * 100} direction="up">
              <div className="bg-white/70 backdrop-blur-sm border border-green-200 rounded-xl p-4 sm:p-6 text-center hover:border-green-500 hover:bg-white/90 transition-all duration-300">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-green-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base text-gray-500 font-semibold">{stat.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <section
      id="home"
      ref={sectionRef}
      className="hero-section relative overflow-hidden"
      style={{ background: '#f0faf0' }}
    >
      <div className="absolute inset-0 z-0" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 15% 50%, rgba(34,197,94,0.18) 0%, transparent 70%),
          radial-gradient(ellipse 70% 55% at 85% 40%, rgba(22,163,74,0.15) 0%, transparent 65%),
          radial-gradient(ellipse 50% 50% at 50% 90%, rgba(74,222,128,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 40% 35% at 75% 80%, rgba(34,197,94,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 35% 40% at 25% 15%, rgba(22,163,74,0.13) 0%, transparent 60%)
        `
      }} />
      <div className="absolute inset-0 z-1 pointer-events-none">
        <div className="absolute hero-orb-1" style={{
          width: 420, height: 420, top: '-80px', left: '-100px',
          background: 'radial-gradient(circle, rgba(34,197,94,0.22) 0%, rgba(34,197,94,0.06) 50%, transparent 72%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'heroFloat1 12s ease-in-out infinite',
        }} />
        <div className="absolute hero-orb-2" style={{
          width: 320, height: 320, top: '10%', right: '-60px',
          background: 'radial-gradient(circle, rgba(22,163,74,0.20) 0%, rgba(22,163,74,0.05) 55%, transparent 75%)',
          borderRadius: '50%',
          filter: 'blur(34px)',
          animation: 'heroFloat2 15s ease-in-out infinite',
        }} />
        <div className="absolute hero-orb-3" style={{
          width: 220, height: 220, bottom: '5%', left: '40%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.24) 0%, rgba(74,222,128,0.06) 50%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(28px)',
          animation: 'heroFloat3 10s ease-in-out infinite',
        }} />
        <div className="absolute hero-orb-4" style={{
          width: 140, height: 140, top: '8%', left: '45%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.30) 0%, rgba(74,222,128,0.08) 45%, transparent 68%)',
          borderRadius: '50%',
          filter: 'blur(18px)',
          animation: 'heroFloat4 8s ease-in-out infinite',
        }} />
        <div className="absolute hero-orb-5" style={{
          width: 280, height: 280, bottom: '-60px', right: '10%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 50%, transparent 72%)',
          borderRadius: '50%',
          filter: 'blur(36px)',
          animation: 'heroFloat5 14s ease-in-out infinite',
        }} />
      </div>
      <svg className="absolute inset-0 w-full h-full z-[2] pointer-events-none" style={{ opacity: 0.06 }}>
        <defs>
          <pattern id="heroGrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgb(34,197,94)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroGrid)" />
      </svg>
      <div className="absolute inset-0 z-[3] pointer-events-none flex items-center justify-center">
        <div style={{
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 65%)',
          animation: 'heroPulse 6s ease-in-out infinite',
        }} />
      </div>
      <div className="absolute inset-0 z-[4] pointer-events-none" style={{ opacity: 0.25 }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
          <filter id="heroNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#heroNoise)" opacity="0.12" />
        </svg>
      </div>
      <div className="absolute top-0 left-0 right-0 h-px z-[5] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(34,197,94,0.35) 50%, transparent 90%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-px z-[5] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(74,222,128,0.25) 50%, transparent 80%)' }} />
      <div
        className="absolute inset-0 z-[60] bg-white pointer-events-none"
        style={{
          opacity: loaded ? 0 : 1,
          transition: 'opacity 0.8s cubic-bezier(.22,1,.36,1)',
        }}
      />
      <div className="relative z-[10]">
        {slides.map((s, index) => (
          <div
            key={s.id}
            className={`transition-all duration-700 ${
              index === currentSlide
                ? 'opacity-100 relative z-10'
                : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            {s.type === 'unv-cctv'        && renderSlide1(s)}
            {s.type === 'smart-door-lock' && renderSlide2(s)}
            {s.type === 'networking'      && renderSlide3(s)}
          </div>
        ))}
      </div>
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 md:p-4 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-green-50 hover:border-green-400 shadow-sm transition-all duration-300 z-50 hover:scale-110"
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 md:p-4 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-green-50 hover:border-green-400 shadow-sm transition-all duration-300 z-50 hover:scale-110"
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-50">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="group relative"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div className={`transition-all duration-300 rounded-full ${
              index === currentSlide
                ? 'w-8 sm:w-12 h-2 sm:h-3 bg-green-600 shadow-md shadow-green-200'
                : 'w-2 sm:w-3 h-2 sm:h-3 bg-gray-300 hover:bg-green-500'
            }`} />
          </button>
        ))}
      </div>
      <style>{`
        .hero-section { min-height: 100vh; }

        @keyframes heroFloat1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%      { transform: translate(40px, 30px) scale(1.06); }
          66%      { transform: translate(-25px, 50px) scale(0.96); }
        }
        @keyframes heroFloat2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40%      { transform: translate(-50px, 35px) scale(1.08); }
          70%      { transform: translate(20px, -30px) scale(0.94); }
        }
        @keyframes heroFloat3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%      { transform: translate(30px, -40px) scale(1.1); }
        }
        @keyframes heroFloat4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          35%      { transform: translate(-20px, 25px) scale(1.15); }
          65%      { transform: translate(25px, -15px) scale(0.9); }
        }
        @keyframes heroFloat5 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          45%      { transform: translate(-35px, -40px) scale(1.05); }
        }
        @keyframes heroPulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%      { transform: scale(1.18); opacity: 0.6; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;