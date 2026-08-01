import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import QuickAccess from './components/QuickAccess';
import InteractivePanels from './components/InteractivePanels';
import Footer from './components/Footer';

type PanelType = 'about' | 'worship' | 'media' | 'location' | 'board' | 'bulletin' | null;

export default function App() {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  // 상단 헤더 네비게이션 클릭 핸들러
  const handleNavClick = (panel: 'about' | 'worship' | 'media' | 'location' | 'board') => {
    setActivePanel(panel);
    // 인터랙티브 패널 영역으로 부드럽게 스크롤
    setTimeout(() => {
      const element = document.getElementById('interactive-panel');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 히어로 오버랩 카드 및 퀵 메뉴 바로가기 클릭 핸들러
  const handleCardClick = (panel: 'worship' | 'bulletin' | 'board' | 'location' | 'media') => {
    // 'bulletin'은 'worship' 또는 전용 탭으로 맵핑 가능하므로, 
    // 여기서는 bulletin을 클릭하면 'bulletin' 패널을 명시적으로 활성화하도록 허용합니다.
    if (panel === 'bulletin') {
      setActivePanel('bulletin');
    } else if (panel === 'location') {
      setActivePanel('location');
    } else {
      setActivePanel(panel as PanelType);
    }

    setTimeout(() => {
      const element = document.getElementById('interactive-panel');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handlePanelClose = () => {
    setActivePanel(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] selection:bg-[#38B2AC]/20 selection:text-[#234E52]">
      
      {/* 1. 상단 플로팅 반투명 헤더 */}
      <Header onNavClick={handleNavClick} activePanel={activePanel} />

      {/* 2. 와이드 아트 히어로 섹션 */}
      <Hero onCardClick={handleCardClick} />

      {/* 3. 대형 인터랙티브 폼 및 가이드 패널 (동적 로딩) */}
      {activePanel && (
        <InteractivePanels panel={activePanel} onClose={handlePanelClose} />
      )}

      {/* 4. 4대 핵심 서비스 와이드 퀵 액세스 바 */}
      <QuickAccess onBtnClick={handleCardClick} />

      {/* 6. 입력 문의 폼 빌트인 & 슬레이트톤 푸터 */}
      <Footer />

    </div>
  );
}
