import React from 'react';
import { Mail, Phone } from 'lucide-react';

const Header = () => {
  return (
    <div className="bg-[#028b4b] text-white font-semibold py-2 px-4 md:px-8">
      <div className="mx-auto flex sm:flex-row justify-center items-center gap-2 sm:gap-6 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <Mail size={14} className="sm:w-4 sm:h-4" />
          <span className="truncate">sales@multifactors-sales.com</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={14} className="sm:w-4 sm:h-4" />
          <span>+63 927 361 7508</span>
        </div>
      </div>
    </div>
  );
};

export default Header;