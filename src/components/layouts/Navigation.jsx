import React, { useState } from 'react';
import { Menu, X} from 'lucide-react';


const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = ['Home', 'About', 'Project', 'Services'];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-[90%] mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center h-16">
         
          <div className="hidden md:flex items-center space-x-8 ">
            <div className="flex space-x-6">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className=" text-[#2B6616] text-lg hover:text-[#509637] transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>

          </div>
          <div className="login">
            <button className="bg-[#235312] text-white px-9 py-2 rounded-md hover:bg-[#509637] transition-colors font-bold">
              LOG IN
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium px-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link}
                </a>
              ))}
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full">
                Login
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};


export default Navigation;