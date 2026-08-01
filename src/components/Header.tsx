import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Menu, X, LogIn, LogOut, Heart, Compass, Navigation } from 'lucide-react';
import ChurchLogo from './ChurchLogo';

interface HeaderProps {
  onNavClick: (panel: 'about' | 'worship' | 'media' | 'location' | 'board') => void;
  activePanel: string | null;
}

export default function Header({ onNavClick, activePanel }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Firebase Auth 상태 변경 감지
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("로그인 성공");
    } catch (error) {
      console.error("로그인 에러:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("로그아웃 성공");
    } catch (error) {
      console.error("로그아웃 에러:", error);
    }
  };

  const menuItems = [
    { label: '교회소개', action: 'about' as const },
    { label: '예배안내', action: 'worship' as const },
    { label: '말씀 · 찬양', action: 'media' as const },
    { label: '오병이어 소식', action: 'board' as const },
    { label: '오시는 길', action: 'location' as const },
  ];

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#F8FCFA] bg-opacity-95 backdrop-blur-md shadow-xs border-b border-[#38C1A5]/15 py-3' 
          : 'bg-[#F8FCFA] bg-opacity-85 backdrop-blur-md py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between relative">
          
          {/* 로고 영역 */}
          <ChurchLogo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

          {/* 데스크톱 & 태블릿 네비게이션 */}
          <nav className="hidden md:flex items-center gap-0.5 md:gap-1 lg:gap-2 xl:absolute xl:left-[51.5%] xl:-translate-x-1/2">
            {menuItems.map((item) => {
              const isActive = activePanel === item.action;
              return (
                <button
                  key={item.action}
                  id={`nav-btn-${item.action}`}
                  onClick={() => onNavClick(item.action)}
                  className={`px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#38C1A5] text-white shadow-xs'
                      : 'text-[#2A3A38] hover:bg-[#38C1A5]/10 hover:text-[#38C1A5]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* 우측 회원 상태 영역 (구글 로그인) */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 lg:gap-3 bg-[#E6F7F3] px-2.5 sm:px-3.5 py-1.5 rounded-full border border-[#38C1A5]/20 shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '성도'}
                    className="w-6 h-6 lg:w-7 lg:h-7 rounded-full object-cover border border-[#38C1A5]/30 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-[#38C1A5] text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {user.displayName?.charAt(0) || '聖'}
                  </div>
                )}
                <span className="text-xs font-semibold text-[#2A3A38] whitespace-nowrap hidden lg:inline">
                  {user.displayName} 성도님
                </span>
                <button
                  id="btn-logout-desktop"
                  onClick={handleLogout}
                  className="p-1 hover:text-[#38C1A5] text-[#2A3A38]/60 transition-colors"
                  title="로그아웃"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                id="btn-login-desktop"
                onClick={handleLogin}
                className="flex items-center gap-1.5 lg:gap-2 bg-[#38C1A5] hover:bg-[#2BB396] text-white px-3.5 py-1.5 lg:px-5 lg:py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-xs hover:shadow-sm whitespace-nowrap shrink-0"
              >
                <LogIn size={14} />
                <span>구글 로그인</span>
              </button>
            )}
          </div>

          {/* 모바일 햄버거 토글 버튼 (md 미만만 표시) */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <img
                src={user.photoURL || undefined}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-[#38C1A5]/30"
                referrerPolicy="no-referrer"
              />
            )}
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-[#2A3A38] hover:bg-[#38C1A5]/10 rounded-full transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* 모바일 전체화면/풀다운 네비게이션 드롭다운 */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#F0F8F5] border-b border-[#38C1A5]/20 shadow-lg px-4 py-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = activePanel === item.action;
              return (
                <button
                  key={item.action}
                  id={`nav-btn-mobile-${item.action}`}
                  onClick={() => {
                    onNavClick(item.action);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                    isActive
                      ? 'bg-[#38C1A5] text-white'
                      : 'text-[#2A3A38] hover:bg-[#38C1A5]/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="h-[1px] bg-[#38C1A5]/15 my-1"></div>

          <div className="px-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-[#2A3A38]">
                    {user.displayName} 성도님 환영합니다!
                  </div>
                </div>
                <button
                  id="btn-logout-mobile"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-[#38C1A5]/30 text-[#28A38B] rounded-xl text-sm font-bold hover:bg-[#38C1A5]/10 transition-colors"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                id="btn-login-mobile"
                onClick={() => {
                  handleLogin();
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#38C1A5] text-white rounded-xl text-sm font-bold hover:bg-[#2BB396] transition-all shadow-sm"
              >
                <LogIn size={16} />
                구글 계정으로 로그인
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
