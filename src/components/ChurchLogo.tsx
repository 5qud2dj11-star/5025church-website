import React from 'react';

interface ChurchLogoProps {
  className?: string;
  showText?: boolean;
  iconOnly?: boolean;
  onClick?: () => void;
}

export default function ChurchLogo({ 
  className = "", 
  showText = true, 
  iconOnly = false,
  onClick 
}: ChurchLogoProps) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-2.5 sm:gap-3 select-none cursor-pointer group ${className}`}
    >
      {/* 십자가 & 펼쳐진 성경책 상징 마크 (업로드된 엠블럼과 100% 동일한 비율 및 색상) */}
      <svg
        viewBox="0 0 100 100"
        className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 shrink-0 transition-transform duration-200 group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 파란색/하늘색 왼쪽 날개 */}
        <path
          d="M 0 0 L 43 6 L 43 78.5 L 0 84 Z"
          fill="#0096E6"
        />

        {/* 연두색/라임 그린 오른쪽 날개 */}
        <path
          d="M 43 12.5 L 100 4 L 100 96 L 43 87.5 Z"
          fill="#66C82B"
        />

        {/* 중앙 정교한 흰색 십자가 */}
        <path
          d="M 42.5 12.5 H 55.5 V 31 H 79 V 39 H 55.5 V 87.5 H 42.5 V 39 H 19 V 31 H 42.5 Z"
          fill="#FFFFFF"
        />
      </svg>

      {/* 로고 텍스트 (대한예수교장로회 / 오병이어교회) */}
      {!iconOnly && showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="w-full flex justify-between text-[9px] sm:text-[10px] md:text-[11px] font-bold text-[#0B2545] mb-1.5 font-sans whitespace-nowrap">
            <span>대</span>
            <span>한</span>
            <span>예</span>
            <span>수</span>
            <span>교</span>
            <span>장</span>
            <span>로</span>
            <span>회</span>
          </div>
          <span className="text-lg sm:text-xl md:text-2xl font-black text-[#0B2545] tracking-tight whitespace-nowrap font-sans">
            오병이어교회
          </span>
        </div>
      )}
    </div>
  );
}



