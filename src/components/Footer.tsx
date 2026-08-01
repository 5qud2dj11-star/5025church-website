import React from 'react';
import ChurchLogo from './ChurchLogo';

export default function Footer() {
  return (
    <footer id="main-footer" className="bg-[#F8FCFA] border-t border-[#38C1A5]/15 pt-12 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 하단: 저작권 및 텍스트 톤 배치 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#243E3B]/70">
          
          <div className="flex items-center gap-3 shrink-0">
            <ChurchLogo iconOnly={true} className="!gap-0" />
            <div className="text-left flex flex-col justify-center">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#243E3B]/70 tracking-wider whitespace-nowrap">
                대한예수교장로회
              </span>
              <span className="text-base sm:text-lg font-black text-[#243E3B] tracking-tight whitespace-nowrap leading-tight">
                오병이어교회
              </span>
              <span className="text-[11px] sm:text-xs text-[#243E3B]/60 font-medium whitespace-nowrap mt-0.5">
                담임목사 정일혁
              </span>
            </div>
          </div>

          <p className="text-center md:text-right font-light">
            © 2026 오병이어교회. All Rights Reserved.
          </p>

        </div>

      </div>
    </footer>
  );
}
