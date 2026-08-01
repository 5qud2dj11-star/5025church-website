import React from 'react';
import { Compass, Clock, FileText, Map, ArrowRight } from 'lucide-react';

interface QuickAccessProps {
  onBtnClick: (panel: 'worship' | 'bulletin' | 'location') => void;
}

export default function QuickAccess({ onBtnClick }: QuickAccessProps) {
  const actions = [
    {
      id: 'btn-quick-worship',
      panel: 'worship' as const,
      label: '예배 시간 안내',
      desc: '주일 및 주중 예배 스케줄 안내',
      icon: Clock,
    },
    {
      id: 'btn-quick-bulletin',
      panel: 'bulletin' as const,
      label: '주일 주보 조회',
      desc: '주일 예배 순서 및 역대 주보 조회',
      icon: FileText,
    },
    {
      id: 'btn-quick-location',
      panel: 'location' as const,
      label: '오시는 길 & 주차',
      desc: '기업도시 교회 위치 및 주차 안내',
      icon: Map,
    },
  ];

  return (
    <section id="quick-access-section" className="pt-12 sm:pt-16 lg:pt-32 pb-20 bg-[#F8FCFA] relative border-b border-[#E2F3ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 섹션 안내 */}
        <div className="mb-10 text-center md:text-left">
          <span className="text-[#38C1A5] text-xs font-bold uppercase tracking-wider block mb-2">
            Quick Navigation
          </span>
          <h3 className="font-serif font-bold text-2xl text-[#243E3B] tracking-tight">
            가장 자주 찾으시는 핵심 서비스
          </h3>
          <p className="text-xs text-[#243E3B]/70 mt-1">
            성도님들이 편리하게 이용하실 수 있는 바로가기 메뉴입니다.
          </p>
        </div>

        {/* 대형 버튼 3개 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 lg:gap-8">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.panel}
                id={item.id}
                onClick={() => onBtnClick(item.panel)}
                className="group relative bg-white border border-[#D5F2E9] p-6 sm:p-5 md:p-5 lg:p-7 rounded-2xl shadow-xs hover:shadow-md hover:bg-[#F3FAF7] text-left transition-all duration-300 flex flex-col justify-between min-h-[13rem] sm:min-h-[13.5rem] md:min-h-[14rem] h-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#38C1A5]/40"
              >
                
                {/* 배경 장식 선 */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#38C1A5] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-t-2xl"></div>

                {/* 아이콘 */}
                <div className="p-3.5 sm:p-4 bg-[#EAF8F4] text-[#38C1A5] rounded-2xl w-fit group-hover:bg-[#38C1A5] group-hover:text-white transition-colors duration-300">
                  <Icon size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
                </div>

                {/* 텍스트 영역 */}
                <div className="mt-5 sm:mt-6 w-full flex flex-col justify-end">
                  <h4 className="font-serif font-bold text-base sm:text-lg text-[#243E3B] group-hover:text-[#38C1A5] transition-colors flex items-center justify-between gap-2">
                    <span className="break-keep whitespace-nowrap">{item.label}</span>
                    <ArrowRight size={16} className="text-[#38C1A5]/50 group-hover:text-[#38C1A5] group-hover:translate-x-1 transition-all shrink-0" />
                  </h4>
                  <p className="text-xs text-[#243E3B]/70 mt-1.5 sm:mt-2 min-h-[2rem] sm:min-h-[2.25rem] flex items-start break-keep leading-relaxed">
                    {item.desc}
                  </p>
                </div>

              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
