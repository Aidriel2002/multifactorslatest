import { useState, useEffect } from 'react';

// Generate particles outside component to satisfy purity rules
const generateParticles = (count) => {
  return [...Array(count)].map(() => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 8}s`,
    animationDuration: `${10 + Math.random() * 10}s`,
  }));
};

const desktopParticles = generateParticles(15);
const mobileParticles = generateParticles(8);

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="home" className="relative bg-[#043000] min-h-screen flex items-center justify-center px-2 xs:px-4 md:px-8 overflow-hidden">
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
              src="./assets/images/MFlogo.png"
              alt="Logo"
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
            <button className="group relative bg-[#2B6616] text-white px-6 xs:px-8 sm:px-10 py-2.5 xs:py-3 sm:py-4 rounded-lg overflow-hidden font-medium text-sm xs:text-base sm:text-lg transition-all duration-300 hover:scale-105 animate-button-glow w-full sm:w-auto">
              <span className="relative z-10">Get Started</span>
              <div className="button-shimmer"></div>
            </button>
            
            <button className="group relative bg-transparent text-white px-6 xs:px-8 sm:px-10 py-2.5 xs:py-3 sm:py-4 rounded-lg font-medium text-sm xs:text-base sm:text-lg border-2 border-[#2B6616] hover:scale-105 transition-all duration-300 overflow-hidden hover:bg-[#2B6616]/10 w-full sm:w-auto">
              <span className="relative z-10">Learn More</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-flow {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(60px);
          }
        }
        
        @keyframes float-particle {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translate(50px, -100vh);
            opacity: 0;
          }
        }
        
        @keyframes orb-float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(80px, -80px) scale(1.1);
          }
        }
        
        @keyframes button-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(43, 102, 22, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(43, 102, 22, 0.6), 0 0 50px rgba(43, 102, 22, 0.3);
          }
        }
        
        @keyframes shimmer-move {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        
        .grid-background {
          position: absolute;
          width: 100%;
          height: 200%;
          animation: grid-flow 4s linear infinite;
        }
        
        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(43, 102, 22, 0.8);
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(43, 102, 22, 0.8);
          animation: float-particle linear infinite;
        }
        
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          background: rgba(43, 102, 22, 0.3);
        }
        
        .orb-1 {
          width: 250px;
          height: 250px;
          top: 20%;
          left: 10%;
          animation: orb-float 20s ease-in-out infinite;
        }
        
        .orb-2 {
          width: 200px;
          height: 200px;
          bottom: 20%;
          right: 10%;
          animation: orb-float 25s ease-in-out infinite 5s;
        }
        
        @media (min-width: 768px) {
          .orb-1 {
            width: 400px;
            height: 400px;
          }
          
          .orb-2 {
            width: 350px;
            height: 350px;
          }
        }
        
        .animate-button-glow {
          animation: button-glow 2s ease-in-out infinite;
        }
        
        .button-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          animation: shimmer-move 3s infinite;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;