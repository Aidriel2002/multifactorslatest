import React from 'react';
import {Mail, Phone } from 'lucide-react';

const Header = () => {
  return (
    <div className="bg-[#08D27A] text-white font-semibold py-2 px-4 md:px-8">
      <div className="mx-auto flex sm:flex-row justify-center items-center gap-2 sm:gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Mail size={16} />
          <span>multifactorssales@gmail.com</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={16} />
          <span>+639 1771 13478</span>
        </div>
      </div>
    </div>
  );
};
export default Header;