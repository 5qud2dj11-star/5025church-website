import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Heart, 
  Clock, 
  BookOpen, 
  MapPin, 
  PenTool, 
  Sparkles, 
  Phone, 
  UserPlus, 
  Trash2, 
  Search, 
  MessageSquare,
  Video,
  Compass,
  Upload,
  X,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MediaGallery from './MediaGallery';
import { BoardPost } from '../types';
import { worshipServices, initialBoardPosts } from '../data';

interface InteractivePanelsProps {
  panel: 'about' | 'worship' | 'media' | 'location' | 'board' | 'bulletin' | null;
  onClose: () => void;
}

export default function InteractivePanels({ panel, onClose }: InteractivePanelsProps) {
  const [user, setUser] = useState<User | null>(null);
  
  // 게시판 관련 상태
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [myPosts, setMyPosts] = useState<BoardPost[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [postTab, setPostTab] = useState<'news' | 'members' | 'bulletin' | 'my'>('news');
  const [bulletinDate, setBulletinDate] = useState('');
  const [scripture, setScripture] = useState('');
  const [prayer, setPrayer] = useState('');
  const [selectedBulletin, setSelectedBulletin] = useState<BoardPost | null>(null);
  const [selectedNews, setSelectedNews] = useState<BoardPost | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<BoardPost | null>(null);
  const [bulletinImages, setBulletinImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [bulletinViewMode, setBulletinViewMode] = useState<'image' | 'text'>('image');
  
  // 연도별 필터링 / 검색 / 페이징 상태
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [membersSearchQuery, setMembersSearchQuery] = useState('');
  const [bulletinSearchQuery, setBulletinSearchQuery] = useState('');
  const [selectedBulletinYear, setSelectedBulletinYear] = useState<string>('All');
  const [bulletinPage, setBulletinPage] = useState<number>(1);
  const [selectedNewsYear, setSelectedNewsYear] = useState<string>('All');
  const [newsPage, setNewsPage] = useState<number>(1);
  const [selectedMembersYear, setSelectedMembersYear] = useState<string>('All');
  const [membersPage, setMembersPage] = useState<number>(1);
  
  // 교인 전용 암호 및 잠금(Lockout) 상태
  const [isMembersUnlocked, setIsMembersUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('isMembersUnlocked') === 'true';
  });
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem('pw_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    const saved = localStorage.getItem('pw_lockout_until');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [membersPasswordInput, setMembersPasswordInput] = useState<string>('');
  const [membersPasswordError, setMembersPasswordError] = useState<string>('');
  const boardScrollContainerRef = useRef<HTMLDivElement>(null);

  const getRemainingLockoutText = (lockoutTime: number) => {
    const diffMs = lockoutTime - Date.now();
    if (diffMs <= 0) return '';
    const totalMinutes = Math.ceil(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const scrollToBoardTop = () => {
    if (boardScrollContainerRef.current) {
      boardScrollContainerRef.current.scrollTo({ top: 0 });
    }
    const element = document.getElementById('interactive-panel');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Auth 및 Firestore 락 상태 동기화
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            if (uData?.isMembersUnlocked === true) {
              setIsMembersUnlocked(true);
              localStorage.setItem('isMembersUnlocked', 'true');
            }
            if (uData?.lockoutUntil) {
              const fLockout = new Date(uData.lockoutUntil).getTime();
              if (fLockout > Date.now()) {
                setLockoutUntil(fLockout);
                localStorage.setItem('pw_lockout_until', fLockout.toString());
              }
            }
            if (typeof uData?.failedAttempts === 'number') {
              setFailedAttempts(uData.failedAttempts);
              localStorage.setItem('pw_failed_attempts', uData.failedAttempts.toString());
            }
          } else {
            const localUnlocked = localStorage.getItem('isMembersUnlocked') === 'true';
            if (localUnlocked) {
              setIsMembersUnlocked(true);
              await setDoc(userDocRef, {
                isMembersUnlocked: true,
                email: currentUser.email || '',
                displayName: currentUser.displayName || '',
                unlockedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
        } catch (err) {
          console.error('교인 인증 상태 동기화 오류:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 게시글 가져오기
  useEffect(() => {
    if (panel === 'board' || panel === 'bulletin') {
      fetchBoardPosts();
      if (user) {
        fetchMyPosts(user.uid);
      }
    }
  }, [panel, user]);

  useEffect(() => {
    if (panel === 'bulletin') {
      setPostTab('bulletin');
    } else if (panel === 'board') {
      setPostTab('news');
    }
  }, [panel]);

  useEffect(() => {
    if (selectedBulletin) {
      if (selectedBulletin.images && selectedBulletin.images.length > 0) {
        setBulletinViewMode('image');
      } else {
        setBulletinViewMode('text');
      }
    }
  }, [selectedBulletin]);

  const fetchBoardPosts = async () => {
    try {
      const q = query(
        collection(db, 'board_posts'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched: BoardPost[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as BoardPost);
      });

      if (fetched.length === 0) {
        setPosts(initialBoardPosts);
      } else {
        setPosts(fetched);
      }
    } catch (e) {
      console.error("게시판 데이터 가져오기 실패, 초기 데이터 사용:", e);
      setPosts(initialBoardPosts);
    }
  };

  const fetchMyPosts = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'board_posts'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetched: BoardPost[] = [];
      snapshot.forEach((d) => {
        fetched.push({ id: d.id, ...d.data() } as BoardPost);
      });
      setMyPosts(fetched);
    } catch (e) {
      console.error("내 게시글 데이터 가져오기 실패:", e);
    }
  };

  // 교인 전용 암호 검증 핸들러
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockoutUntil) {
      setMembersPasswordError(`비밀번호 시도 횟수를 초과했습니다. ${getRemainingLockoutText(lockoutUntil)} 후에 다시 시도해주세요.`);
      return;
    }

    if (membersPasswordInput === '0801') {
      setIsMembersUnlocked(true);
      setFailedAttempts(0);
      setLockoutUntil(0);
      localStorage.setItem('isMembersUnlocked', 'true');
      localStorage.removeItem('pw_failed_attempts');
      localStorage.removeItem('pw_lockout_until');
      setMembersPasswordError('');
      setMembersPasswordInput('');

      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            isMembersUnlocked: true,
            failedAttempts: 0,
            lockoutUntil: null,
            unlockedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("DB 접근 상태 저장 실패:", err);
        }
      }
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('pw_failed_attempts', newAttempts.toString());

      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 24 * 60 * 60 * 1000;
        setLockoutUntil(lockoutTime);
        localStorage.setItem('pw_lockout_until', lockoutTime.toString());
        setMembersPasswordError("비밀번호 5회 오류! 24시간 동안 교인 전용 접속이 제한됩니다.");

        if (user) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              failedAttempts: newAttempts,
              lockoutUntil: new Date(lockoutTime).toISOString()
            }, { merge: true });
          } catch (err) {
            console.error("DB 락아웃 저장 실패:", err);
          }
        }
      } else {
        setMembersPasswordError(`비밀번호가 올바르지 않습니다. (${newAttempts}/5회 오류)`);
        if (user) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              failedAttempts: newAttempts
            }, { merge: true });
          } catch (err) {
            console.error("DB 오류횟수 저장 실패:", err);
          }
        }
      }
    }
  };

  // 게시글 생성 핸들러
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.email !== '5qud2dj11@gmail.com') {
      alert('교회 관리자 계정만 작성 가능합니다.');
      return;
    }

    if (postTab === 'members' && !isMembersUnlocked) {
      alert('교인 전용 암호 인증이 필요합니다.');
      return;
    }

    let contentText = postContent.trim();
    if (postTab === 'bulletin') {
      if (bulletinImages.length === 0) {
        alert('주보 지면 이미지를 1장 이상 등록해주세요.');
        return;
      }
      contentText = '(지면 주보가 등록되었습니다.)';
    } else {
      if (!postTitle.trim() || !contentText) {
        alert('제목과 내용을 입력해주세요.');
        return;
      }
    }

    setPostLoading(true);
    try {
      const newPost: Omit<BoardPost, 'id'> = {
        title: postTitle.trim(),
        content: contentText,
        userId: user.uid,
        userName: user.displayName || '교회 관리자',
        createdAt: new Date().toISOString(),
        type: postTab === 'bulletin' ? 'bulletin' : postTab === 'members' ? 'members' : 'news'
      };

      if (user.photoURL) {
        newPost.userPhoto = user.photoURL;
      }

      if (postTab === 'bulletin') {
        if (bulletinDate.trim()) newPost.bulletinDate = bulletinDate.trim();
        if (scripture.trim()) newPost.scripture = scripture.trim();
        if (prayer.trim()) newPost.prayer = prayer.trim();
        if (bulletinImages.length > 0) {
          newPost.images = bulletinImages;
        }
      }

      await addDoc(collection(db, 'board_posts'), newPost);
      
      setPostTitle('');
      setPostContent('');
      setBulletinDate('');
      setScripture('');
      setPrayer('');
      setBulletinImages([]);

      await fetchBoardPosts();
      await fetchMyPosts(user.uid);
      alert('성공적으로 등록되었습니다.');
    } catch (error) {
      console.error("게시글 등록 오류:", error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setPostLoading(false);
    }
  };

  // 게시글 삭제
  const handlePostDelete = async (id: string | undefined) => {
    if (!user || user.email !== '5qud2dj11@gmail.com') {
      alert('삭제 권한이 없습니다.');
      return;
    }
    if (!id || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'board_posts', id));
      if (user) fetchMyPosts(user.uid);
      fetchBoardPosts();
    } catch (e) {
      console.error("게시글 삭제 실패:", e);
    }
  };

  // 이미지 업로드 압축
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setImageUploading(true);
    const filesArray: File[] = Array.from(files);
    const loadedImages: string[] = [];
    let processedCount = 0;
    
    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 950;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.65);
            loadedImages.push(base64);
          }
          
          processedCount++;
          if (processedCount === filesArray.length) {
            setBulletinImages((prev) => [...prev, ...loadedImages]);
            setImageUploading(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeBulletinImage = (index: number) => {
    setBulletinImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 데이터 필터 및 페이징
  const newsPosts = posts.filter(p => (p.type === 'news' || !p.type) && p.type !== 'members' && p.type !== 'bulletin');
  const filteredNewsPosts = newsPosts.filter(p => {
    if (!newsSearchQuery.trim()) return true;
    const q = newsSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  const newsYears: number[] = Array.from(new Set(newsPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))).sort((a, b) => b - a);

  const yearlyFilteredNews = filteredNewsPosts.filter(p => {
    if (selectedNewsYear === 'All') return true;
    return new Date(p.createdAt).getFullYear().toString() === selectedNewsYear;
  });

  const newsItemsPerPage = 4;
  const totalNewsPages = Math.ceil(yearlyFilteredNews.length / newsItemsPerPage) || 1;
  const currentNewsPage = Math.min(newsPage, totalNewsPages);
  const displayedNews = yearlyFilteredNews.slice((currentNewsPage - 1) * newsItemsPerPage, currentNewsPage * newsItemsPerPage);

  const membersPosts = posts.filter(p => p.type === 'members');
  const filteredMembersPosts = membersPosts.filter(p => {
    if (!membersSearchQuery.trim()) return true;
    const q = membersSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  const membersYears: number[] = Array.from(new Set(membersPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))).sort((a, b) => b - a);

  const yearlyFilteredMembers = filteredMembersPosts.filter(p => {
    if (selectedMembersYear === 'All') return true;
    return new Date(p.createdAt).getFullYear().toString() === selectedMembersYear;
  });

  const membersItemsPerPage = 4;
  const totalMembersPages = Math.ceil(yearlyFilteredMembers.length / membersItemsPerPage) || 1;
  const currentMembersPage = Math.min(membersPage, totalMembersPages);
  const displayedMembers = yearlyFilteredMembers.slice((currentMembersPage - 1) * membersItemsPerPage, currentMembersPage * membersItemsPerPage);

  const bulletinPosts = posts.filter(p => p.type === 'bulletin');
  const filteredBulletinPosts = bulletinPosts.filter(p => {
    if (!bulletinSearchQuery.trim()) return true;
    const q = bulletinSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || (p.scripture && p.scripture.toLowerCase().includes(q));
  });

  const bulletinYears: number[] = Array.from(new Set(bulletinPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))).sort((a, b) => b - a);

  const yearlyFilteredBulletins = filteredBulletinPosts.filter(p => {
    if (selectedBulletinYear === 'All') return true;
    return new Date(p.createdAt).getFullYear().toString() === selectedBulletinYear;
  });

  const itemsPerPage = 5;
  const totalBulletinPages = Math.ceil(yearlyFilteredBulletins.length / itemsPerPage) || 1;
  const currentBulletinPage = Math.min(bulletinPage, totalBulletinPages);
  const displayedBulletins = yearlyFilteredBulletins.slice((currentBulletinPage - 1) * itemsPerPage, currentBulletinPage * itemsPerPage);

  const activeLatestBulletin = bulletinPosts.length > 0 ? bulletinPosts[0] : {
    title: "금주 주일 대예배 주보",
    bulletinDate: "2026년 7월 26일 주일",
    scripture: "요한복음 6장 35절",
    prayer: "이우진 장로",
    content: `■ 예배 순서\n1. 예배 부름 - 예배 인도자\n2. 신앙 고백 - 사도신경 (다함께)\n3. 찬송 - 21장 '다 찬양하여라' (다함께)\n4. 대표 기도 - 이우진 장로\n5. 성경 봉독 - 요한복음 6장 35절\n6. 말씀 선포 - '내가 곧 생명의 떡이니' (정일혁 목사)\n7. 결단 찬양 - 350장 '우리들의 싸울 것은' (다함께)\n8. 축도 - 정일혁 목사\n\n■ 이번 주 특별 공지\n- 다음 주 대표 기도는 송은미 권사님입니다.\n- 주일 점심 식사는 2층 만나홀에서 제공됩니다.`
  };

  if (!panel) return null;

  return (
    <div id="interactive-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-6 sm:mt-8 lg:mt-32 scroll-mt-24">
      
      {/* 원본 사진 모달 (라이트박스) */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors cursor-pointer"
            onClick={() => setActiveLightboxImage(null)}
          >
            <X size={28} />
          </button>
          <img 
            src={activeLightboxImage} 
            alt="주보 원본 이미지" 
            className="max-w-full max-h-[92vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="bg-white border border-[#2F3E46]/10 rounded-3xl shadow-md overflow-hidden relative">
        
        {/* 상단 포인트 라인 */}
        <div className="h-1.5 bg-gradient-to-r from-[#0096E6] via-[#22B8CF] to-[#73C800]"></div>

        {/* 패널 타이틀 헤더 */}
        <div className="p-4 sm:p-8 bg-[#FAF9F6] border-b border-[#2F3E46]/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-[#0096E6]/10 text-[#0096E6] rounded-xl sm:rounded-2xl shrink-0">
              {panel === 'about' && <Sparkles size={20} />}
              {panel === 'worship' && <Clock size={20} />}
              {panel === 'bulletin' && <BookOpen size={20} />}
              {panel === 'location' && <MapPin size={20} />}
              {panel === 'board' && <MessageSquare size={20} />}
              {panel === 'media' && <Video size={20} />}
            </div>
            <h3 className="font-serif font-bold text-base sm:text-2xl text-[#2F3E46] truncate">
              {panel === 'about' && '교회 소개'}
              {panel === 'worship' && '예배 시간 안내'}
              {panel === 'bulletin' && '주일 주보 조회'}
              {panel === 'location' && '오시는 길 & 주차'}
              {panel === 'board' && '오병이어 소식'}
              {panel === 'media' && '말씀 · 찬양 영상'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#2F3E46]/15 hover:bg-[#FAF9F6] text-[#2F3E46] text-xs font-bold rounded-full transition-all cursor-pointer shrink-0"
          >
            <X size={14} />
            <span>닫기</span>
          </button>
        </div>

        {/* 패널 본문 컨텐츠 */}
        <div className="p-6 sm:p-10">

          {/* 1. 교회소개 */}
          {panel === 'about' && (
            <div className="space-y-8">
              <div className="p-6 sm:p-10 bg-white border border-[#38C1A5]/20 rounded-2xl shadow-xs">
                <span className="inline-block px-3 py-1 bg-[#38C1A5]/10 text-[#2EB096] text-xs font-bold rounded-full mb-3">
                  담임목사 인사말
                </span>
                <h4 className="font-serif font-bold text-xl sm:text-3xl text-[#2F3E46] mb-4">
                  "하나님의 은혜가 여러분들의 가정 속에 흘러넘치기를 소망합니다"
                </h4>
                <div className="space-y-3 text-[#2F3E46]/90 text-sm sm:text-base leading-relaxed">
                  <p>사랑하는 성도 여러분, 오병이어교회 방문을 진심으로 환영합니다.</p>
                  <p>오병이어교회는 보리떡 다섯 개와 물고기 두 마리의 작은 헌신을 통해 수많은 이들을 먹이신 예수님의 기적처럼, 작은 말씀과 사랑의 실천으로 이 땅에 하나님의 은혜를 전하는 공동체입니다.</p>
                  <p className="pt-4 font-serif font-bold text-right text-[#2EB096]">담임목사 정일혁</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. 예배안내 */}
          {panel === 'worship' && (
            <div className="overflow-hidden rounded-2xl border border-[#2F3E46]/10 shadow-2xs bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#2F3E46]/10 text-[#2F3E46]">
                    <th className="py-4 px-6 font-bold">예배 / 모임 명</th>
                    <th className="py-4 px-6 font-bold">시간</th>
                    <th className="py-4 px-6 font-bold">장소</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2F3E46]/10 text-[#2F3E46]/80">
                  {worshipServices.map((ws, index) => (
                    <tr key={index} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-4 px-6 font-medium text-[#2F3E46]">{ws.name}</td>
                      <td className="py-4 px-6">{ws.time}</td>
                      <td className="py-4 px-6 text-[#4F6D7A] font-medium">{ws.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. 미디어 */}
          {panel === 'media' && <MediaGallery />}

          {/* 4. 오시는 길 */}
          {panel === 'location' && (
            <div className="p-6 bg-[#FAF9F6] rounded-2xl border border-[#2F3E46]/10 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-[#0096E6] mt-1 shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-[#2F3E46] text-lg">교회 위치</h4>
                  <p className="text-sm text-[#2F3E46]/80 mt-1">강원특별자치도 원주시 서원대로 123 (단계동)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-3 border-t border-[#2F3E46]/10">
                <Phone className="text-[#0096E6] mt-1 shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-[#2F3E46] text-lg">문의 전화</h4>
                  <p className="text-sm text-[#2F3E46]/80 mt-1">033-700-0000</p>
                </div>
              </div>
            </div>
          )}

          {/* 5. 주보 조회 */}
          {panel === 'bulletin' && (
            <div className="space-y-6" ref={boardScrollContainerRef}>
              {user && user.email === '5qud2dj11@gmail.com' && (
                <div className="p-5 bg-[#FAF9F6] rounded-2xl border border-[#0096E6]/20 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#2F3E46]/10 pb-2">
                    <PenTool size={18} className="text-[#0096E6]" />
                    <h4 className="font-bold text-[#2F3E46] text-base">관리자 주보 신규 등록</h4>
                  </div>
                  <form onSubmit={handlePostSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="제목 (예: 2026년 8월 2일 주일 주보)"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className="px-3.5 py-2 text-sm bg-white border border-[#2F3E46]/15 rounded-xl focus:outline-none"
                        required
                      />
                      <input
                        type="text"
                        placeholder="예배 일자"
                        value={bulletinDate}
                        onChange={(e) => setBulletinDate(e.target.value)}
                        className="px-3.5 py-2 text-sm bg-white border border-[#2F3E46]/15 rounded-xl focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="대표 기도자"
                        value={prayer}
                        onChange={(e) => setPrayer(e.target.value)}
                        className="px-3.5 py-2 text-sm bg-white border border-[#2F3E46]/15 rounded-xl focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="설교 본문 말씀"
                      value={scripture}
                      onChange={(e) => setScripture(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-[#2F3E46]/15 rounded-xl focus:outline-none"
                    />
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-[#2F3E46]">주보 이미지 첨부 (필수)</label>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#2F3E46]/20 rounded-xl text-xs font-bold text-[#2F3E46] hover:bg-gray-50">
                        <Upload size={14} />
                        <span>사진 파일 선택</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                      {imageUploading && <span className="text-xs text-[#0096E6] ml-2">변환 중...</span>}
                      {bulletinImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {bulletinImages.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-20 rounded-lg overflow-hidden border border-[#2F3E46]/20">
                              <img src={img} alt="주보 썸네일" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeBulletinImage(idx)}
                                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={postLoading}
                      className="w-full py-2.5 bg-[#0096E6] text-white text-sm font-bold rounded-xl hover:bg-[#0085CC] cursor-pointer"
                    >
                      {postLoading ? '등록 중...' : '주보 등록'}
                    </button>
                  </form>
                </div>
              )}

              {!selectedBulletin ? (
                <div className="space-y-5">
                  <div className="p-6 bg-gradient-to-br from-[#FAF9F6] to-[#0096E6]/5 border border-[#0096E6]/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-[#0096E6] text-white text-[11px] font-bold rounded-full mb-2">
                        최신 주보
                      </span>
                      <h4 className="font-serif font-bold text-xl text-[#2F3E46]">{activeLatestBulletin.title}</h4>
                      <p className="text-xs text-[#2F3E46]/70 mt-1">{activeLatestBulletin.bulletinDate || '금주 주일'}</p>
                    </div>
                    <button
                      onClick={() => setSelectedBulletin(activeLatestBulletin as BoardPost)}
                      className="px-5 py-2.5 bg-[#0096E6] text-white text-xs font-bold rounded-xl hover:bg-[#0085CC] cursor-pointer"
                    >
                      주보 크게보기
                    </button>
                  </div>

                  {/* 검색 및 필터 */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-[#2F3E46]">연도별:</span>
                      <select
                        value={selectedBulletinYear}
                        onChange={(e) => { setSelectedBulletinYear(e.target.value); setBulletinPage(1); }}
                        className="px-3 py-1.5 text-xs bg-white border border-[#2F3E46]/20 rounded-lg"
                      >
                        <option value="All">전체 연도</option>
                        {bulletinYears.map((yr) => (
                          <option key={yr} value={yr.toString()}>{yr}년</option>
                        ))}
                      </select>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="주보 검색..."
                        value={bulletinSearchQuery}
                        onChange={(e) => { setBulletinSearchQuery(e.target.value); setBulletinPage(1); }}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#2F3E46]/20 rounded-xl"
                      />
                      <Search size={14} className="absolute left-3 top-2.5 text-[#2F3E46]/40" />
                    </div>
                  </div>

                  {/* 목록 */}
                  <div className="grid grid-cols-1 gap-3">
                    {displayedBulletins.map((bulletin) => (
                      <div
                        key={bulletin.id}
                        onClick={() => { setSelectedBulletin(bulletin); scrollToBoardTop(); }}
                        className="p-4 bg-white rounded-xl border border-[#2F3E46]/10 hover:border-[#0096E6]/40 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-bold text-[#2F3E46] text-sm">{bulletin.title}</h4>
                          <p className="text-xs text-[#2F3E46]/60 mt-1">{bulletin.bulletinDate || bulletin.createdAt?.slice(0, 10)}</p>
                        </div>
                        <ChevronRight size={18} className="text-[#2F3E46]/40" />
                      </div>
                    ))}
                  </div>

                  {/* 페이지네이션 */}
                  {totalBulletinPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <button
                        onClick={() => setBulletinPage(p => Math.max(1, p - 1))}
                        disabled={currentBulletinPage === 1}
                        className="p-2 border border-[#2F3E46]/20 rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-medium text-[#2F3E46] px-3">{currentBulletinPage} / {totalBulletinPages}</span>
                      <button
                        onClick={() => setBulletinPage(p => Math.min(totalBulletinPages, p + 1))}
                        disabled={currentBulletinPage === totalBulletinPages}
                        className="p-2 border border-[#2F3E46]/20 rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* 주보 상세 보기 */
                <div className="bg-white p-6 rounded-2xl border border-[#2F3E46]/10 space-y-6">
                  <div className="flex justify-between items-center border-b border-[#2F3E46]/10 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#2F3E46]">{selectedBulletin.title}</h3>
                      <p className="text-xs text-[#2F3E46]/60 mt-1">{selectedBulletin.bulletinDate || selectedBulletin.createdAt?.slice(0, 10)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedBulletin(null)}
                      className="px-4 py-2 text-xs font-bold bg-[#FAF9F6] border border-[#2F3E46]/20 rounded-xl cursor-pointer"
                    >
                      목록으로
                    </button>
                  </div>

                  {selectedBulletin.images && selectedBulletin.images.length > 0 ? (
                    <div className="space-y-4">
                      {selectedBulletin.images.map((imgUrl, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setActiveLightboxImage(imgUrl)}
                          className="cursor-zoom-in rounded-xl overflow-hidden border border-[#2F3E46]/10"
                        >
                          <img src={imgUrl} alt={`주보 지면 ${idx + 1}`} className="w-full h-auto" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-[#2F3E46] text-sm leading-relaxed p-4 bg-gray-50 rounded-xl">
                      {selectedBulletin.content}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. 게시판 / 교회소식 */}
          {panel === 'board' && (
            <div className="space-y-6" ref={boardScrollContainerRef}>
              <div className="flex border-b border-[#2F3E46]/10 gap-2 pb-2">
                <button
                  onClick={() => { setPostTab('news'); setSelectedNews(null); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer ${
                    postTab === 'news' ? 'bg-[#2F3E46] text-white' : 'bg-[#FAF9F6] text-[#2F3E46]/70'
                  }`}
                >
                  교회 소식
                </button>
                <button
                  onClick={() => { setPostTab('members'); setSelectedMembers(null); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer ${
                    postTab === 'members' ? 'bg-[#2F3E46] text-white' : 'bg-[#FAF9F6] text-[#2F3E46]/70'
                  }`}
                >
                  교인 전용
                </button>
              </div>

              {/* 교회소식 */}
              {postTab === 'news' && (
                <div>
                  {!selectedNews ? (
                    <div className="space-y-4">
                      {/* 검색 및 필터 */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className="text-xs font-bold text-[#2F3E46]">연도별:</span>
                          <select
                            value={selectedNewsYear}
                            onChange={(e) => { setSelectedNewsYear(e.target.value); setNewsPage(1); }}
                            className="px-3 py-1.5 text-xs bg-white border border-[#2F3E46]/20 rounded-lg"
                          >
                            <option value="All">전체 연도</option>
                            {newsYears.map((yr) => (
                              <option key={yr} value={yr.toString()}>{yr}년</option>
                            ))}
                          </select>
                        </div>
                        <div className="relative w-full sm:w-64">
                          <input
                            type="text"
                            placeholder="소식 검색..."
                            value={newsSearchQuery}
                            onChange={(e) => { setNewsSearchQuery(e.target.value); setNewsPage(1); }}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#2F3E46]/20 rounded-xl"
                          />
                          <Search size={14} className="absolute left-3 top-2.5 text-[#2F3E46]/40" />
                        </div>
                      </div>

                      {/* 소식 목록 */}
                      <div className="grid grid-cols-1 gap-3">
                        {displayedNews.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => { setSelectedNews(post); scrollToBoardTop(); }}
                            className="p-4 bg-white rounded-xl border border-[#2F3E46]/10 hover:border-[#2F3E46]/30 cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <h4 className="font-bold text-[#2F3E46] text-sm">{post.title}</h4>
                              <p className="text-xs text-[#2F3E46]/60 mt-1">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                            <ChevronRight size={18} className="text-[#2F3E46]/40" />
                          </div>
                        ))}
                      </div>

                      {/* 소식 페이지네이션 */}
                      {totalNewsPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                          <button
                            onClick={() => setNewsPage(p => Math.max(1, p - 1))}
                            disabled={currentNewsPage === 1}
                            className="p-2 border border-[#2F3E46]/20 rounded-lg disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs font-medium text-[#2F3E46] px-3">{currentNewsPage} / {totalNewsPages}</span>
                          <button
                            onClick={() => setNewsPage(p => Math.min(totalNewsPages, p + 1))}
                            disabled={currentNewsPage === totalNewsPages}
                            className="p-2 border border-[#2F3E46]/20 rounded-lg disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 소식 상세 보기 */
                    <div className="bg-white p-6 rounded-2xl border border-[#2F3E46]/10 space-y-4">
                      <div className="flex justify-between items-start border-b border-[#2F3E46]/10 pb-4">
                        <div>
                          <h3 className="text-xl font-bold text-[#2F3E46]">{selectedNews.title}</h3>
                          <p className="text-xs text-[#2F3E46]/60 mt-1">{selectedNews.createdAt ? new Date(selectedNews.createdAt).toLocaleDateString() : ''}</p>
                        </div>
                        <button onClick={() => setSelectedNews(null)} className="px-4 py-2 text-xs font-bold bg-[#FAF9F6] border border-[#2F3E46]/20 rounded-xl cursor-pointer">
                          목록으로
                        </button>
                      </div>
                      <div className="text-[#2F3E46] whitespace-pre-wrap leading-relaxed text-sm">
                        {selectedNews.content}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 교인전용 */}
              {postTab === 'members' && (
                <div>
                  {!isMembersUnlocked ? (
                    <div className="p-8 text-center bg-[#FAF9F6] rounded-2xl border border-[#2F3E46]/10 space-y-4 max-w-md mx-auto my-6">
                      <Lock size={32} className="mx-auto text-[#2F3E46]/60" />
                      <h4 className="font-bold text-[#2F3E46] text-lg">교인 전용 인증</h4>
                      <p className="text-xs text-[#2F3E46]/70">교인 전용 암호를 입력해주세요.</p>
                      <form onSubmit={handlePasswordSubmit} className="space-y-3">
                        <input
                          type="password"
                          placeholder="비밀번호 입력 (기본: 0801)"
                          value={membersPasswordInput}
                          onChange={(e) => setMembersPasswordInput(e.target.value)}
                          disabled={Date.now() < lockoutUntil}
                          className="w-full px-4 py-2.5 text-sm bg-white border border-[#2F3E46]/20 rounded-xl text-center focus:outline-none"
                        />
                        {membersPasswordError && <p className="text-xs text-red-500 font-bold">{membersPasswordError}</p>}
                        <button
                          type="submit"
                          disabled={Date.now() < lockoutUntil}
                          className="w-full py-2.5 bg-[#2F3E46] text-white text-sm font-bold rounded-xl hover:bg-[#3A4D56] cursor-pointer"
                        >
                          인증하기
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div>
                      {/* 관리자 쓰기 폼 (교인전용) */}
                      {user && user.email === '5qud2dj11@gmail.com' && (
                        <div className="p-5 bg-[#FAF9F6] rounded-2xl border border-[#2F3E46]/20 mb-6 space-y-3">
                          <div className="flex items-center gap-2 border-b border-[#2F3E46]/10 pb-2">
                            <PenTool size={18} className="text-[#2F3E46]" />
                            <h4 className="font-bold text-[#2F3E46] text-base">관리자 교인전용 소식 작성</h4>
                          </div>
                          <form onSubmit={handlePostSubmit} className="space-y-3">
                            <input
                              type="text"
                              placeholder="제목을 입력하세요"
                              value={postTitle}
                              onChange={(e) => setPostTitle(e.target.value)}
                              className="w-full px-3.5 py-2 text-sm bg-white border border-[#2F3E46]/15 rounded-xl focus:outline-none"
                              required
                            />
                            <textarea
                              placeholder="내용을 입력하세요..."
                              value={postContent}
                              onChange={(e) => setPostContent(e.target.value)}
                              rows={4}
                              className="w-full px-3.5 py-2 text-sm bg-white border border-[#2F3E46]/15 rounded-xl focus:outline-none resize-none"
                              required
                            />
                            <button
                              type="submit"
                              disabled={postLoading}
                              className="w-full py-2.5 bg-[#2F3E46] text-white text-sm font-bold rounded-xl hover:bg-[#3A4D56] cursor-pointer"
                            >
                              {postLoading ? '등록 중...' : '등록하기'}
                            </button>
                          </form>
                        </div>
                      )}

                      {!selectedMembers ? (
                        <div className="space-y-4">
                          {/* 검색 및 필터 */}
                          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="text-xs font-bold text-[#2F3E46]">연도별:</span>
                              <select
                                value={selectedMembersYear}
                                onChange={(e) => { setSelectedMembersYear(e.target.value); setMembersPage(1); }}
                                className="px-3 py-1.5 text-xs bg-white border border-[#2F3E46]/20 rounded-lg"
                              >
                                <option value="All">전체 연도</option>
                                {membersYears.map((yr) => (
                                  <option key={yr} value={yr.toString()}>{yr}년</option>
                                ))}
                              </select>
                            </div>
                            <div className="relative w-full sm:w-64">
                              <input
                                type="text"
                                placeholder="교인게시판 검색..."
                                value={membersSearchQuery}
                                onChange={(e) => { setMembersSearchQuery(e.target.value); setMembersPage(1); }}
                                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#2F3E46]/20 rounded-xl"
                              />
                              <Search size={14} className="absolute left-3 top-2.5 text-[#2F3E46]/40" />
                            </div>
                          </div>

                          {/* 목록 */}
                          <div className="grid grid-cols-1 gap-3">
                            {displayedMembers.map((post) => (
                              <div
                                key={post.id}
                                onClick={() => { setSelectedMembers(post); scrollToBoardTop(); }}
                                className="p-4 bg-white rounded-xl border border-[#2F3E46]/10 hover:border-[#2F3E46]/30 cursor-pointer flex justify-between items-center"
                              >
                                <div>
                                  <h4 className="font-bold text-[#2F3E46] text-sm">{post.title}</h4>
                                  <p className="text-xs text-[#2F3E46]/60 mt-1">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</p>
                                </div>
                                {user && user.email === '5qud2dj11@gmail.com' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePostDelete(post.id); }}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg mr-2"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                <ChevronRight size={18} className="text-[#2F3E46]/40" />
                              </div>
                            ))}
                          </div>

                          {/* 페이지네이션 */}
                          {totalMembersPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                              <button
                                onClick={() => setMembersPage(p => Math.max(1, p - 1))}
                                disabled={currentMembersPage === 1}
                                className="p-2 border border-[#2F3E46]/20 rounded-lg disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span className="text-xs font-medium text-[#2F3E46] px-3">{currentMembersPage} / {totalMembersPages}</span>
                              <button
                                onClick={() => setMembersPage(p => Math.min(totalMembersPages, p + 1))}
                                disabled={currentMembersPage === totalMembersPages}
                                className="p-2 border border-[#2F3E46]/20 rounded-lg disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* 상세 보기 */
                        <div className="bg-white p-6 rounded-2xl border border-[#2F3E46]/10 space-y-4">
                          <div className="flex justify-between items-start border-b border-[#2F3E46]/10 pb-4">
                            <div>
                              <h3 className="text-xl font-bold text-[#2F3E46]">{selectedMembers.title}</h3>
                              <p className="text-xs text-[#2F3E46]/60 mt-1">{selectedMembers.createdAt ? new Date(selectedMembers.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                            <button onClick={() => setSelectedMembers(null)} className="px-4 py-2 text-xs font-bold bg-[#FAF9F6] border border-[#2F3E46]/20 rounded-xl cursor-pointer">
                              목록으로
                            </button>
                          </div>
                          <div className="text-[#2F3E46] whitespace-pre-wrap leading-relaxed text-sm">
                            {selectedMembers.content}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
