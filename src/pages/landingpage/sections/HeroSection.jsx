import { useState, useEffect } from 'react';
import logo from '../images/MFlogo.png'
import './HeroSection.css';

const generateParticles = (count) => 
  Array.from({ length: count }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 8}s`,
    animationDuration: `${10 + Math.random() * 10}s`,
  }));

const desktopParticles = generateParticles(15);
const mobileParticles = generateParticles(8);

const HeroSection = ({ onGetStartedClick, onLearnMoreClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="home" className="hero-section relative bg-[#043000] min-h-screen flex items-center justify-center px-2 xs:px-4 md:px-8 overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div 
          className="grid-background"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(43, 102, 22, 0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(43, 102, 22, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        ></div>
      </div>

      <div className="absolute inset-0 hidden sm:block">
        {desktopParticles.map((particle, i) => (
          <div
            key={i}
            className="particle"
            style={particle}
          ></div>
        ))}
      </div>
      <div className="absolute inset-0 sm:hidden">
        {mobileParticles.map((particle, i) => (
          <div
            key={i}
            className="particle"
            style={particle}
          ></div>
        ))}
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center">
          <div 
            className={`mb-4 xs:mb-6 sm:mb-8 transform transition-all duration-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}
          >
            <img 
              src={logo}
              alt="MF Logo"
              className="mx-auto w-auto h-24 xs:h-32 sm:h-40 md:h-48 object-cover rounded-lg shadow-2xl border-2 border-[#2B6616]"
            />
          </div>

          <h1 
            className={`text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 text-white px-4 transform transition-all duration-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}
          >
            <span className="relative inline-block">
              CCTV INSTALLATION AND SYSTEM INTEGRATION
              <span className="absolute inset-0 text-[#2B6616] opacity-40 blur-sm">
                CCTV INSTALLATION AND SYSTEM INTEGRATION
              </span>
            </span>
          </h1>

          <div 
            className={`flex flex-col sm:flex-row gap-3 xs:gap-4 sm:gap-6 justify-center px-4 transform transition-all duration-1000 delay-500 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            <button 
              onClick={onGetStartedClick}
              className="group relative bg-[#2B6616] text-white px-6 xs:px-8 sm:px-10 py-2.5 xs:py-3 sm:py-4 rounded-lg overflow-hidden font-medium text-sm xs:text-base sm:text-lg transition-all duration-300 hover:scale-105 animate-button-glow w-full sm:w-auto"
            >
              <span className="relative z-10">Get Started</span>
              <div className="button-shimmer"></div>
            </button>
            
            <button 
              onClick={onLearnMoreClick}
              className="group relative bg-transparent text-white px-6 xs:px-8 sm:px-10 py-2.5 xs:py-3 sm:py-4 rounded-lg font-medium text-sm xs:text-base sm:text-lg border-2 border-[#2B6616] hover:scale-105 transition-all duration-300 overflow-hidden hover:bg-[#2B6616]/10 w-full sm:w-auto"
            >
              <span className="relative z-10">Learn More</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;