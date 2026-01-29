import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Navigation = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = ['Home', 'About', 'Project', 'Products', 'Services'];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-[90%] mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="desktop-nav flex items-center space-x-6">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-[#2B6616] text-lg hover:text-[#509637] transition-colors font-medium"
              >
                {link}
              </a>
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
          <div className="mobile-menu py-4 border-t">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="text-[#2B6616] hover:text-[#509637] transition-colors font-medium px-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link}
                </a>
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
        )}
      </div>

      <style>{`
        /* Hide mobile elements on desktop */
        *{
          box-sizing: border-box;
          scroll-behavior: smooth;
        }
        @media (min-width: 768px) {
          .mobile-menu-btn {
            display: none;
          }
          .mobile-menu {
            display: none;
          }
        }

        /* Hide desktop elements on mobile */
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