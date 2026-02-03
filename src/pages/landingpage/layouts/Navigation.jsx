import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '#home', type: 'scroll' },
    { name: 'About', path: '#about', type: 'scroll' },
    { name: 'Project', path: '/projects', type: 'route' },
    { name: 'Products', path: '/productlist', type: 'route' },
    { name: 'Services', path: '#services', type: 'scroll' }
  ];

  const handleNavClick = (link) => {
    setIsMenuOpen(false);

    if (link.type === 'scroll') {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          scrollToSection(link.path);
        }, 100);
      } else {
        scrollToSection(link.path);
      }
    } else {
      navigate(link.path);
    }
  };

  const scrollToSection = (path) => {
    const sectionId = path.replace('#', '');
    const element = document.getElementById(sectionId);
    
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-[90%] mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="desktop-nav flex items-center space-x-6">
           {navLinks.map((link, index) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link)}
                className="nav-link-wrapper group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="relative text-[15px] font-medium tracking-wide text-[#2B6616] group-hover:text-[#235312] transition-all duration-300">
                  {link.name}
                  <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#509637] rounded-full w-0 group-hover:w-full transition-all duration-300"></span>
                </span>
              </button>
            ))}
          </div>

          <div className="desktop-login">
            <button 
              onClick={onLoginClick}
              className="bg-[#235312] text-white px-9 py-2 rounded-md hover:bg-[#509637] transition-colors font-bold"
            >
              LOG IN
            </button>
          </div>

          <div className="mobile-menu-btn">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-[#2B6616]"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="mobile-menu absolute left-0 right-0 bg-white shadow-lg border-t">
            <div className="max-w-[90%] mx-auto px-4 md:px-8 py-4">
              <div className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => handleNavClick(link)}
                    className="text-[#2B6616] hover:text-[#509637] transition-colors font-medium px-2 text-left"
                  >
                    {link.name}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    onLoginClick();
                    setIsMenuOpen(false);
                  }}
                  className="bg-[#235312] text-white px-6 py-2 rounded-md hover:bg-[#509637] transition-colors w-full font-bold"
                >
                  LOG IN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        *{
          box-sizing: border-box;
          scroll-behavior: smooth;
        }

        .mobile-menu {
          top: 100%;
        }

        @media (min-width: 768px) {
          .mobile-menu-btn {
            display: none;
          }
          .mobile-menu {
            display: none;
          }
        }

        @media (max-width: 767px) {
          .desktop-nav {
            display: none;
          }
          .desktop-login {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navigation;