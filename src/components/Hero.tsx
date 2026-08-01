import React from 'react';
import { Clock, BookOpen, MessageSquare, Compass, ArrowRight, Video } from 'lucide-react';

interface HeroProps {
  onCardClick: (panel: 'worship' | 'bulletin' | 'board' | 'location' | 'media') => void;
}

export default function Hero({ onCardClick }: HeroProps) {
  return (
    <section id="hero-section" className="relative pt-28 pb-12 lg:pb-32 bg-[#F8FCFA]">
      
      {/* 백그라운드 데코레이션 래퍼 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* 백그라운드 디자인: 부드럽고 맑은 라이트 파스텔 민트 그라데이션 */}
        <div className="absolute inset-0 flex flex-col md:flex-row opacity-35">
          <div className="w-full md:w-1/2 h-1/2 md:h-full bg-gradient-to-tr from-[#E6F8F3] via-[#F8FCFA] to-transparent relative">
            <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#38C1A5]/10 rounded-full blur-3xl"></div>
          </div>

          <div className="w-full md:w-1/2 h-1/2 md:h-full bg-gradient-to-bl from-[#E6F8F3] via-[#F8FCFA] to-transparent relative">
            <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-[#4FD1C5]/10 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* 은은한 오병이어 프리미엄 아트워크 배경 */}
        <div className="absolute inset-x-0 top-[170px] sm:top-[195px] md:top-[215px] -translate-y-1/2 flex items-center justify-center pointer-events-none overflow-hidden z-0 select-none">
          <div className="relative w-[340px] h-[340px] sm:w-[520px] sm:h-[520px] md:w-[680px] md:h-[680px] lg:w-[820px] lg:h-[820px] xl:w-[920px] xl:h-[920px] opacity-[0.08] sm:opacity-[0.09] transition-all duration-700 select-none">
            <svg className="w-full h-full text-[#38C1A5]" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 후광 가이드 링들 */}
              <circle cx="60" cy="60" r="54" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.8" strokeDasharray="3 3" />
              <circle cx="60" cy="60" r="49" stroke="#38C1A5" strokeOpacity="0.5" strokeWidth="0.5" />
              <circle cx="60" cy="60" r="44" stroke="#4FD1C5" strokeOpacity="0.4" strokeWidth="0.5" strokeDasharray="1 4" />
              
              {/* 물고기 1 */}
              <g className="text-[#38C1A5]">
                <path d="M 28,48 C 30,32 58,26 78,38 C 66,46 56,48 45,49 C 34,50 30,49 28,48 Z" fill="#E6F8F3" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 46,28 C 55,16 68,20 70,33" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 40,49 C 45,56 52,55 51,49" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 78,38 C 88,32 95,22 97,19 C 91,33 92,39 93,42 C 90,45 91,51 97,60 C 93,48 87,44 78,38 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 37,39 C 39,42 38,46 36,48" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <circle cx="33" cy="40" r="1.5" fill="currentColor" />
                <path d="M 46,37 Q 48,41 47,45 M 53,38 Q 55,42 54,46 M 60,40 Q 62,43 61,46" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1.5" strokeLinecap="round" />
              </g>

              {/* 물고기 2 */}
              <g className="text-[#2EB096]">
                <path d="M 92,72 C 90,88 62,94 42,82 C 54,74 64,72 75,71 C 86,70 90,71 92,72 Z" fill="#E6F8F3" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 74,92 C 65,104 52,100 50,87" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 80,71 C 75,64 68,65 69,71" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 42,82 C 32,88 25,98 23,101 C 29,87 28,81 27,78 C 30,75 29,69 23,60 C 27,72 33,76 42,82 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 83,81 C 81,78 82,74 84,72" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                <circle cx="87" cy="80" r="1.5" fill="currentColor" />
                <path d="M 74,83 Q 72,79 73,75 M 67,82 Q 65,78 66,74 M 60,80 Q 58,77 59,74" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1.5" strokeLinecap="round" />
              </g>

              {/* 5개의 빵 */}
              <g className="text-[#38C1A5]">
                <ellipse cx="60" cy="60" rx="10" ry="7.5" fill="#E6F8F3" stroke="#38C1A5" strokeWidth="1.2" />
                <path d="M 57,58 C 58,61 59,62 58,63 M 60,57 C 61,60 62,61 61,62 M 63,58 C 64,60 65,61 64,62" stroke="#38C1A5" strokeWidth="0.8" strokeLinecap="round" />

                <g transform="rotate(-20 46 51)">
                  <ellipse cx="46" cy="51" rx="8" ry="6" fill="#E6F8F3" stroke="#38C1A5" strokeWidth="1.0" />
                  <path d="M 43,50 L 49,52 M 44,53 L 48,54" stroke="#38C1A5" strokeWidth="0.8" strokeLinecap="round" />
                </g>

                <g transform="rotate(25 74 69)">
                  <ellipse cx="74" cy="69" rx="8" ry="6" fill="#E6F8F3" stroke="#38C1A5" strokeWidth="1.0" />
                  <path d="M 71,68 L 77,70 M 72,71 L 76,72" stroke="#38C1A5" strokeWidth="0.8" strokeLinecap="round" />
                </g>

                <g transform="rotate(10 60 45)">
                  <ellipse cx="60" cy="45" rx="8" ry="6" fill="#E6F8F3" stroke="#38C1A5" strokeWidth="1.0" />
                  <path d="M 57,44 Q 60,47 63,44" stroke="#38C1A5" strokeWidth="0.8" strokeLinecap="round" />
                </g>

                <g transform="rotate(-15 60 75)">
                  <ellipse cx="60" cy="75" rx="8" ry="6" fill="#E6F8F3" stroke="#38C1A5" strokeWidth="1.0" />
                  <path d="M 57,74 Q 60,77 63,74" stroke="#38C1A5" strokeWidth="0.8" strokeLinecap="round" />
                </g>
              </g>

              {/* 중심 빛나는 광채 */}
              <circle cx="60" cy="60" r="3" fill="#38C1A5" fillOpacity="0.25" />
              <circle cx="60" cy="60" r="1.5" fill="#38C1A5" />
            </svg>
          </div>
        </div>

        {/* 미니멀 라인 기하학 패턴 */}
        <div className="absolute inset-x-0 top-[170px] sm:top-[195px] md:top-[215px] -translate-y-1/2 flex items-center justify-center opacity-15 pointer-events-none">
          <div className="w-full max-w-6xl h-px bg-gradient-to-r from-transparent via-[#38C1A5]/20 to-transparent"></div>
          <div className="absolute w-[260px] h-[260px] sm:w-[420px] sm:h-[420px] md:w-[600px] md:h-[600px] lg:w-[750px] lg:h-[750px] xl:w-[850px] xl:h-[850px] border border-[#38C1A5]/10 rounded-full"></div>
          <div className="absolute w-[420px] h-[420px] sm:w-[620px] sm:h-[620px] md:w-[800px] md:h-[800px] lg:w-[1000px] lg:h-[1000px] xl:w-[1150px] xl:h-[1150px] border border-[#38C1A5]/6 rounded-full"></div>
          <div className="absolute w-[580px] h-[580px] sm:w-[820px] sm:h-[820px] md:w-[1000px] md:h-[1000px] lg:w-[1250px] lg:h-[1250px] xl:w-[1450px] xl:h-[1450px] border border-[#38C1A5]/4 rounded-full border-dashed"></div>
        </div>
      </div>

      {/* 히어로 콘텐츠 */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        
        {/* 심플 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EAF8F4] border border-[#D5F2E9] rounded-full text-xs font-bold text-[#204944] shadow-xs mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#38C1A5] animate-pulse"></span>
          <span>기적과 사랑이 시작되는 곳</span>
        </div>

        {/* 메인 카피 */}
        <h2 className="font-serif font-bold text-3xl sm:text-5xl md:text-6xl text-[#1F3D39] leading-tight sm:leading-tight md:leading-tight mb-6 max-w-5xl tracking-tight text-shadow-sm text-center">
          <span className="block lg:inline-block lg:mr-3">
            채움 받는 은혜<span className="hidden lg:inline">,</span>
          </span>
          <span className="text-[#1F3D39] block lg:inline-block mt-1 lg:mt-0">흘려보내는 사랑</span>
        </h2>

        {/* 서브 카피 */}
        <p className="font-sans text-base sm:text-lg md:text-xl text-[#243E3B]/85 max-w-3xl font-normal leading-relaxed mb-8">
          생명을 살리는 복음의 공동체, <strong className="font-bold text-[#1F3D39] border-b-2 border-[#38C1A5]/30 pb-0.5">오병이어 교회</strong>
        </p>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 sm:mb-20">
          <button
            id="hero-cta-location"
            onClick={() => onCardClick('location')}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#38C1A5] hover:bg-[#2BB396] text-white font-bold rounded-full text-sm shadow-md shadow-[#38C1A5]/20 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
          >
            오시는 길 & 주차 안내
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            id="hero-cta-worship"
            onClick={() => onCardClick('worship')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-[#EAF8F4] border border-[#D5F2E9] text-[#243E3B] font-bold rounded-full text-sm shadow-xs transition-all duration-300 cursor-pointer"
          >
            예배시간 안내
          </button>
        </div>

      </div>

      {/* 하단 오버랩 링크 카드 (Overlap Floating Cards) */}
      <div className="relative z-20 mt-6 lg:mt-0 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:transform lg:translate-y-1/2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 가이드 안내 문구 */}
          <div className="text-center mb-4 sm:mb-5">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl sm:rounded-full bg-[#EAF8F4] border border-[#D5F2E9] text-[#204944] text-xs sm:text-[11px] font-bold tracking-normal sm:tracking-wider shadow-xs backdrop-blur-sm text-center leading-relaxed">
              <span className="hidden sm:flex relative h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38C1A5] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38C1A5]"></span>
              </span>
              <span className="break-keep">
                교회 핵심 메뉴 바로가기
                <span className="hidden sm:inline"> · </span>
                <br className="sm:hidden" />
                카드를 터치하시면 하단에 상세 안내가 열립니다.
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            
            {/* 카드 1 */}
            <div
              id="hero-floating-card-worship"
              onClick={() => onCardClick('worship')}
              className="bg-white hover:bg-[#F3FAF7] border border-[#D5F2E9] p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[9.5rem] h-auto relative group overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#38C1A5]/10 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
              <div className="p-2.5 bg-[#EAF8F4] text-[#38C1A5] rounded-xl w-fit mb-3">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243E3B] mb-0.5 break-keep">예배 시간 안내</h4>
                <p className="text-[11px] text-[#243E3B]/70 break-keep">교회 주일 및 주중 예배 스케줄</p>
              </div>
            </div>

            {/* 카드 2 */}
            <div
              id="hero-floating-card-media"
              onClick={() => onCardClick('media')}
              className="bg-white hover:bg-[#F3FAF7] border border-[#D5F2E9] p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[9.5rem] h-auto relative group overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#38C1A5]/10 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
              <div className="p-2.5 bg-[#EAF8F4] text-[#38C1A5] rounded-xl w-fit mb-3">
                <Video size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243E3B] mb-0.5 break-keep">말씀 · 찬양 영상</h4>
                <p className="text-[11px] text-[#243E3B]/70 break-keep">주일 설교 및 은혜로운 찬양 영상</p>
              </div>
            </div>

            {/* 카드 3 */}
            <div
              id="hero-floating-card-bulletin"
              onClick={() => onCardClick('bulletin')}
              className="bg-white hover:bg-[#F3FAF7] border border-[#D5F2E9] p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[9.5rem] h-auto relative group overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#38C1A5]/10 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
              <div className="p-2.5 bg-[#EAF8F4] text-[#38C1A5] rounded-xl w-fit mb-3">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243E3B] mb-0.5 break-keep">주일 주보 조회</h4>
                <p className="text-[11px] text-[#243E3B]/70 break-keep">예배 순서 및 역대 주보 실시간 조회</p>
              </div>
            </div>

            {/* 카드 4 */}
            <div
              id="hero-floating-card-board"
              onClick={() => onCardClick('board')}
              className="bg-white hover:bg-[#F3FAF7] border border-[#D5F2E9] p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transform hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[9.5rem] h-auto relative group overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-[#38C1A5]/10 rounded-full group-hover:scale-125 transition-transform duration-300"></div>
              <div className="p-2.5 bg-[#EAF8F4] text-[#38C1A5] rounded-xl w-fit mb-3">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#243E3B] mb-0.5 break-keep">오병이어 소식</h4>
                <p className="text-[11px] text-[#243E3B]/70 break-keep">교회의 풍성한 은혜와 따뜻한 이야기</p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </section>
  );
}
