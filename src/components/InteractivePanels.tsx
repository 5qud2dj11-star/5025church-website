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
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Heart, 
  Clock, 
  BookOpen, 
  MapPin, 
  PenTool, 
  Sparkles, 
  Calendar, 
  Phone, 
  UserPlus, 
  Send, 
  Trash2, 
  Check, 
  Flame, 
  Search, 
  Info, 
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Video,
  Compass,
  ArrowLeft,
  Upload,
  X,
  Image,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MediaGallery from './MediaGallery';
import { BoardPost, Registration, WorshipService } from '../types';
import { worshipServices, bulletinNews, initialBoardPosts } from '../data';

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
  
  // 역대 주보 및 공지사항 더보기 / 검색 관련 상태
  const [showAllNews, setShowAllNews] = useState(false);
  const [showAllBulletins, setShowAllBulletins] = useState(false);
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [membersSearchQuery, setMembersSearchQuery] = useState('');
  const [bulletinSearchQuery, setBulletinSearchQuery] = useState('');
  const [selectedBulletinYear, setSelectedBulletinYear] = useState<string>('All');
  const [bulletinPage, setBulletinPage] = useState<number>(1);
  const [selectedNewsYear, setSelectedNewsYear] = useState<string>('All');
  const [newsPage, setNewsPage] = useState<number>(1);
  const [selectedMembersYear, setSelectedMembersYear] = useState<string>('All');
  const [membersPage, setMembersPage] = useState<number>(1);
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

  // 첫 방문 가이드 관련 상태

  // 현재 사용자 로그인 모니터링 및 교인 전용 게시판 잠금 해제 상태 동기화 (모든 기기/환경 연동)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // 구글 로그인된 유저의 Firestore 데이터 확인
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
            // 현재 클라이언트에 저장된 상태 동기화
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

  // 게시글 및 새가족 데이터 가져오기
  useEffect(() => {
    if (panel === 'board' || panel === 'bulletin') {
      fetchBoardPosts();
      if (user) {
        fetchMyPosts(user.uid);
      }
    }
    // 첫 방문 가이드는 로그인 여부에 관계없이 누구나 볼 수 있습니다
  }, [panel, user]);

  // 패널 종류에 따른 기본 탭 설정
  useEffect(() => {
    if (panel === 'bulletin') {
      setPostTab('bulletin');
    } else if (panel === 'board') {
      setPostTab('news');
    }
  }, [panel]);

  // 선택한 주보의 기본 뷰 모드 설정 (사진이 있으면 사진 탭, 없으면 텍스트 탭)
  useEffect(() => {
    if (selectedBulletin) {
      if (selectedBulletin.images && selectedBulletin.images.length > 0) {
        setBulletinViewMode('image');
      } else {
        setBulletinViewMode('text');
      }
    }
  }, [selectedBulletin]);

  // 전체 게시글 불러오기 (Firestore)
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
      
      // 기존에 등록된 주보 글들 중 이미지가 없으면 기본 샘플 이미지를 적용하여 빈 화면 방지
      const enriched = fetched.map(post => {
        if (post.type === 'bulletin' && (!post.images || post.images.length === 0)) {
          return {
            ...post,
            images: [
              "https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f?auto=format&fit=crop&q=80&w=1200",
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200"
            ]
          };
        }
        return post;
      });

      if (fetched.length === 0) {
        setPosts(initialBoardPosts);
      } else {
        setPosts(enriched);
      }
    } catch (e) {
      console.error("게시판 조회 실패, 데모 데이터 출력:", e);
      setPosts(initialBoardPosts);
    }
  };

  // 내가 쓴 게시글 불러오기 (Firestore)
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
      
      const enriched = fetched.map(post => {
        if (post.type === 'bulletin' && (!post.images || post.images.length === 0)) {
          return {
            ...post,
            images: [
              "https://images.unsplash.com/photo-1586075010923-2dd45e9b2d4f?auto=format&fit=crop&q=80&w=1200",
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200"
            ]
          };
        }
        return post;
      });
      
      setMyPosts(enriched);
    } catch (e) {
      console.error("나의 게시글 조회 실패:", e);
    }
  };



  // 게시글 제출하기
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.email !== '5qud2dj11@gmail.com') {
      alert('죄송합니다. 교회 게시글 등록 권한이 없습니다. (교회 관리자 계정 전용)');
      return;
    }

    if (postTab === 'members' && !isMembersUnlocked) {
      alert('교인 전용 게시판 비밀번호 인증 후 게시글 등록이 가능합니다. (기본 비밀번호: 0801)');
      return;
    }

    let contentText = postContent.trim();
    if (postTab === 'bulletin') {
      if (bulletinImages.length === 0) {
        alert('주일 주보의 지면 사진을 최소 1장 이상 등록해 주세요.');
        return;
      }
      contentText = '(지면 주보가 등록되었습니다.)';
    } else {
      if (!postTitle.trim() || !contentText) {
        alert('제목과 내용을 모두 입력해 주세요.');
        return;
      }
    }

    setPostLoading(true);
    try {
      const newPost: Omit<BoardPost, 'id'> = {
        title: postTitle.trim(),
        content: contentText,
        userId: user.uid,
        userName: user.displayName || '익명 성도',
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
      
      // 폼 리셋
      setPostTitle('');
      setPostContent('');
      setBulletinDate('');
      setScripture('');
      setPrayer('');
      setBulletinImages([]);

      // 리프레시
      await fetchBoardPosts();
      await fetchMyPosts(user.uid);
      alert(
        postTab === 'bulletin' 
          ? '주일 주보가 성공적으로 등록되었습니다.' 
          : postTab === 'members'
          ? '교인 전용 게시글이 성공적으로 등록되었습니다.'
          : '교회 소식이 성공적으로 등록되었습니다.'
      );
    } catch (error) {
      console.error("게시글 등록 오류:", error);
      alert('게시글 등록에 실패했습니다. 관리자에게 문의바랍니다.');
    } finally {
      setPostLoading(false);
    }
  };

  // 게시글 삭제하기
  const handlePostDelete = async (id: string | undefined) => {
    if (!user || user.email !== '5qud2dj11@gmail.com') {
      alert('삭제 권한이 없습니다.');
      return;
    }
    if (!id || !confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'board_posts', id));
      if (user) {
        fetchMyPosts(user.uid);
      }
      fetchBoardPosts();
    } catch (e) {
      console.error("게시글 삭제 에러:", e);
    }
  };

  // 주보 이미지 업로드 및 압축 핸들러 (Base64 변환)
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
          
          // 가로 또는 세로 최대 950px 크기로 다운스케일하여 용량 최소화
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
            // 압축 퀄리티 0.65로 JPEG 인코딩 (엄청난 용량 감소 및 높은 해상도 유지)
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



  const newsPosts = posts.filter(p => (p.type === 'news' || !p.type) && p.type !== 'members' && p.type !== 'bulletin');
  const filteredNewsPosts = newsPosts.filter(p => {
    if (!newsSearchQuery.trim()) return true;
    const query = newsSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query);
  });

  // Extract years dynamically from newsPosts and sort descending
  const newsYears: number[] = (Array.from(new Set(newsPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))) as number[]).sort((a: number, b: number) => b - a);

  // Filter by selected year
  const yearlyFilteredNews = filteredNewsPosts.filter(p => {
    if (selectedNewsYear === 'All') return true;
    const year = new Date(p.createdAt).getFullYear();
    return year.toString() === selectedNewsYear;
  });

  const newsItemsPerPage = 4;
  const totalNewsPages = Math.ceil(yearlyFilteredNews.length / newsItemsPerPage) || 1;
  const currentNewsPage = Math.min(newsPage, totalNewsPages);
  const displayedNews = yearlyFilteredNews.slice((currentNewsPage - 1) * newsItemsPerPage, currentNewsPage * newsItemsPerPage);

  // 교인 전용 게시판 필터링 로직
  const membersPosts = posts.filter(p => p.type === 'members');
  const filteredMembersPosts = membersPosts.filter(p => {
    if (!membersSearchQuery.trim()) return true;
    const query = membersSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query);
  });

  const membersYears: number[] = (Array.from(new Set(membersPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))) as number[]).sort((a: number, b: number) => b - a);

  const yearlyFilteredMembers = filteredMembersPosts.filter(p => {
    if (selectedMembersYear === 'All') return true;
    const year = new Date(p.createdAt).getFullYear();
    return year.toString() === selectedMembersYear;
  });

  const membersItemsPerPage = 4;
  const totalMembersPages = Math.ceil(yearlyFilteredMembers.length / membersItemsPerPage) || 1;
  const currentMembersPage = Math.min(membersPage, totalMembersPages);
  const displayedMembers = yearlyFilteredMembers.slice((currentMembersPage - 1) * membersItemsPerPage, currentMembersPage * membersItemsPerPage);

  const bulletinPosts = posts.filter(p => p.type === 'bulletin');
  const filteredBulletinPosts = bulletinPosts.filter(p => {
    if (!bulletinSearchQuery.trim()) return true;
    const query = bulletinSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || (p.scripture && p.scripture.toLowerCase().includes(query));
  });

  // Extract years dynamically from bulletinPosts and sort descending
  const bulletinYears: number[] = (Array.from(new Set(bulletinPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))) as number[]).sort((a: number, b: number) => b - a);

  // Filter by selected year
  const yearlyFilteredBulletins = filteredBulletinPosts.filter(p => {
    if (selectedBulletinYear === 'All') return true;
    const year = new Date(p.createdAt).getFullYear();
    return year.toString() === selectedBulletinYear;
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
    content: `■ 예배 순서
1. 예배 부름 - 예배 인도자
2. 신앙 고백 - 사도신경 (다함께)
3. 찬송 - 21장 '다 찬양하여라' (다함께)
4. 대표 기도 - 이우진 장로
5. 성경 봉독 - 요한복음 6장 35절
6. 말씀 선포 - '내가 곧 생명의 떡이니' (정일혁 목사)
7. 결단 찬양 - 350장 '우리들의 싸울 것은' (다함께)
8. 축도 - 정일혁 목사

■ 이번 주 특별 공지
- 다음 주 대표 기도는 송은미 권사님입니다.
- 주일 점심 식사는 2층 만나홀에서 제공됩니다.
- 예배 후 교육부서 교사 모임이 있습니다.`
  };

  if (!panel) return null;

  return (
    <div id="interactive-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mt-6 sm:mt-8 lg:mt-32 scroll-mt-24">
      <div className="bg-white border border-[#2F3E46]/10 rounded-3xl shadow-md overflow-hidden relative transition-all duration-300">
        
        {/* 상단 띠 배너 */}
        <div className="h-1.5 bg-gradient-to-r from-[#0096E6] via-[#22B8CF] to-[#73C800]"></div>

        {/* 패널 타이틀 및 닫기 */}
        <div className="p-4 sm:p-8 bg-[#FAF9F6] border-b border-[#2F3E46]/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-[#0096E6]/10 text-[#0096E6] rounded-xl sm:rounded-2xl shrink-0">
              {panel === 'about' && <Sparkles size={20} className="sm:w-[22px] sm:h-[22px]" />}
              {panel === 'worship' && <Clock size={20} className="sm:w-[22px] sm:h-[22px]" />}
              {panel === 'bulletin' && <BookOpen size={20} className="sm:w-[22px] sm:h-[22px]" />}
              {panel === 'location' && <MapPin size={20} className="sm:w-[22px] sm:h-[22px]" />}
              {panel === 'board' && <MessageSquare size={20} className="sm:w-[22px] sm:h-[22px]" />}
              {panel === 'media' && <Video size={20} className="sm:w-[22px] sm:h-[22px]" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-base sm:text-2xl text-[#2F3E46] truncate">
                {panel === 'about' && '교회 소개'}
                {panel === 'worship' && '예배 시간 안내'}
                {panel === 'bulletin' && '주일 주보 조회'}
                {panel === 'location' && '오시는 길 & 주차'}
                {panel === 'board' && '오병이어 소식'}
                {panel === 'media' && '말씀 · 찬양 영상'}
              </h3>
            </div>
          </div>
          <button
            id="btn-panel-close"
            onClick={onClose}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-[#2F3E46]/15 hover:border-[#2F3E46]/30 hover:bg-[#FAF9F6] active:scale-95 text-[#2F3E46] text-xs font-bold rounded-full transition-all shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
          >
            <X size={14} className="text-[#2F3E46]/70 shrink-0 sm:w-4 sm:h-4" />
            <span className="whitespace-nowrap">닫기</span>
          </button>
        </div>

        {/* 패널 내용 분기 */}
        <div className="p-6 sm:p-10">

          {/* ==================== 1. 교회소개 (About) ==================== */}
          {panel === 'about' && (
            <div className="space-y-8 sm:space-y-12 animate-fade-in">
              <div className="max-w-4xl mx-auto">
                <div className="p-4 sm:p-10 bg-white border border-[#38C1A5]/20 rounded-2xl sm:rounded-3xl shadow-xs relative overflow-hidden">
                  {/* Subtle background glow accent */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#38C1A5]/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#38C1A5]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-4 sm:space-y-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 bg-[#38C1A5]/10 text-[#2EB096] text-xs font-bold rounded-full">
                        담임목사 인사말
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#2F3E46] leading-snug sm:whitespace-nowrap">
                      <span className="block sm:inline">"하나님의 은혜가</span>{" "}
                      <span className="block sm:inline">여러분들의 가정 속에</span>{" "}
                      <span className="block sm:inline">흘러넘치기를 소망합니다"</span>
                    </h4>

                    {/* Opening Welcome Callout */}
                    <div className="p-3.5 sm:p-5 bg-[#38C1A5]/8 border-l-3 sm:border-l-4 border-[#38C1A5] rounded-r-xl">
                      <p className="font-medium text-[#2F3E46] text-xs sm:text-lg leading-relaxed sm:leading-relaxed">
                        <span className="block sm:inline">사랑하는 여러분,</span>{" "}
                        <span className="block sm:inline">하나님의 은혜가 여러분들의 가정 속에</span>{" "}
                        <span className="block sm:inline">흘러넘치길 소망하며 환영합니다.</span>
                      </p>
                    </div>

                    <div className="space-y-3.5 sm:space-y-4 text-[#2F3E46]/90 text-[13px] sm:text-base font-light pt-1">
                      <p className="leading-relaxed sm:leading-loose">
                        <span className="block sm:inline">오병이어교회는 예수님께서</span>{" "}
                        <span className="block sm:inline">보리떡 다섯 개와 물고기 두 마리로</span>{" "}
                        <span className="block sm:inline">수많은 사람을 먹이신 기적처럼,</span>{" "}
                        <span className="block sm:inline">작은 헌신을 통해 하나님의 큰 은혜가</span>{" "}
                        <span className="block sm:inline">흘러가는 교회가 되기를 소망합니다.</span>
                      </p>
                      <p className="leading-relaxed sm:leading-loose">
                        <span className="block sm:inline">우리 교회는 말씀 위에 세워지고,</span>{" "}
                        <span className="block sm:inline">예배로 하나님을 만나며,</span>{" "}
                        <span className="block sm:inline">사랑으로 이웃을 섬기는 공동체를 꿈꿉니다.</span>{" "}
                        <span className="block sm:inline mt-2 sm:mt-0">또한 한 사람 한 사람을 소중히 여기며,</span>{" "}
                        <span className="block sm:inline">다음세대를 세우고,</span>{" "}
                        <span className="block sm:inline">지역과 열방을 품는 교회가 되기 위해</span>{" "}
                        <span className="block sm:inline">걸어가고 있습니다.</span>
                      </p>
                      <p className="leading-relaxed sm:leading-loose">
                        <span className="block sm:inline">신앙은 혼자 걷는 길이 아니라</span>{" "}
                        <span className="block sm:inline">함께 걸어가는 은혜의 여정입니다.</span>{" "}
                        <span className="block sm:inline mt-2 sm:mt-0">이곳에서 하나님을 더 깊이 만나고,</span>{" "}
                        <span className="block sm:inline">삶의 회복과 소망을 경험하며,</span>{" "}
                        <span className="block sm:inline">예수 그리스도의 사랑 안에서</span>{" "}
                        <span className="block sm:inline">새로운 힘을 얻으시기를 바랍니다.</span>
                      </p>
                      <p className="leading-relaxed sm:leading-loose">
                        <span className="block sm:inline">오병이어교회의 문은 언제나 열려 있습니다.</span>{" "}
                        <span className="block sm:inline">여러분을 예배의 자리에서</span>{" "}
                        <span className="block sm:inline">기쁨으로 만나 뵙기를 기대합니다.</span>
                      </p>

                      <div className="pt-4 sm:pt-6 border-t border-[#2F3E46]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 mt-5 sm:mt-6">
                        <p className="text-xs sm:text-sm font-serif italic text-[#2F3E46]/75 leading-relaxed">
                          <span className="block sm:inline">"오병이어교회의 문은 언제나</span>{" "}
                          <span className="block sm:inline">여러분들을 향해 열려있습니다."</span>
                        </p>
                        <div className="text-right self-end sm:self-auto pt-1 sm:pt-0">
                          <p className="text-xs sm:text-sm font-serif font-bold text-[#2F3E46]">감사합니다.</p>
                          <p className="text-sm sm:text-lg font-serif font-bold text-[#2EB096] mt-0.5">
                            오병이어교회 담임목사 정일혁
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5대 핵심 가치 */}
              <div className="pt-6 sm:pt-10 border-t border-[#2F3E46]/10">
                <div className="text-center mb-5 sm:mb-10">
                  <span className="text-[11px] sm:text-xs font-bold bg-[#38C1A5]/10 text-[#2EB096] px-3 py-1 rounded-full uppercase tracking-wider">
                    5 Core Values
                  </span>
                  <h5 className="font-serif font-bold text-lg sm:text-2xl lg:text-3xl text-[#2F3E46] mt-2 mb-1.5 sm:mb-2 break-keep [word-break:keep-all]">
                    오병이어교회의 5대 핵심 가치
                  </h5>
                  <p className="text-xs sm:text-sm text-[#2F3E46]/70 max-w-lg mx-auto break-keep [word-break:keep-all]">
                    생명의 떡이신 예수 그리스도의 사랑 안에서 세워가는 5가지 사역 방향
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-4 xl:gap-5">
                  {[
                    {
                      num: '01',
                      title: '말씀과 예배',
                      desc: '살아 숨 쉬는 생명의 말씀과 거룩한 예배로 영적 회복과 깊은 은혜를 누립니다.',
                      icon: BookOpen,
                      color: '#2EB096',
                      badgeColor: 'bg-[#2EB096] text-white',
                      iconBg: 'bg-[#2EB096]/12 text-[#2EB096]',
                    },
                    {
                      num: '02',
                      title: '다음 세대 양육',
                      desc: '미래의 주역인 자녀들을 말씀과 기도의 반석 위에 바로 세우고 양육합니다.',
                      icon: Sparkles,
                      color: '#4F6D7A',
                      badgeColor: 'bg-[#4F6D7A] text-white',
                      iconBg: 'bg-[#4F6D7A]/12 text-[#4F6D7A]',
                    },
                    {
                      num: '03',
                      title: '따뜻한 교제와 안식',
                      desc: '주님의 사랑으로 마음을 나누며 지친 일상 속에 편안한 안식을 제공합니다.',
                      icon: Heart,
                      color: '#3B7A57',
                      badgeColor: 'bg-[#3B7A57] text-white',
                      iconBg: 'bg-[#3B7A57]/12 text-[#3B7A57]',
                    },
                    {
                      num: '04',
                      title: '전도와 복음 선교',
                      desc: '오병이어의 기적처럼 영적 주림에 있는 이들에게 생명의 예수님을 전합니다.',
                      icon: Compass,
                      color: '#3A6375',
                      badgeColor: 'bg-[#3A6375] text-white',
                      iconBg: 'bg-[#3A6375]/12 text-[#3A6375]',
                    },
                    {
                      num: '05',
                      title: '지역 사랑과 나눔',
                      desc: '이웃을 내 몸처럼 섬기며 따뜻한 손길로 선한 영향력과 사랑을 전합니다.',
                      icon: UserPlus,
                      color: '#2F3E46',
                      badgeColor: 'bg-[#2F3E46] text-white',
                      iconBg: 'bg-[#2F3E46]/12 text-[#2F3E46]',
                    },
                  ].map((val, idx) => {
                    const ValueIcon = val.icon;
                    return (
                      <div
                        key={idx}
                        className={`bg-[#FAF9F6]/90 sm:bg-white border border-[#2F3E46]/10 hover:border-[#38C1A5]/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                          idx === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
                        }`}
                      >
                        {/* Top Accent Line */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 transition-opacity opacity-75 group-hover:opacity-100"
                          style={{ backgroundColor: val.color }}
                        />

                        <div>
                          {/* Badge & Icon Header */}
                          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                            <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-mono font-bold text-xs flex items-center justify-center shadow-2xs ${val.badgeColor}`}>
                              {val.num}
                            </span>
                            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${val.iconBg}`}>
                              <ValueIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </div>
                          </div>

                          {/* Title */}
                          <h6 className="font-serif font-bold text-[#2F3E46] text-sm sm:text-lg leading-snug break-keep [word-break:keep-all] group-hover:text-[#2EB096] transition-colors">
                            {val.title}
                          </h6>

                          {/* Description */}
                          <p className="text-xs sm:text-sm text-[#2F3E46]/75 leading-relaxed font-light break-keep [word-break:keep-all] mt-1.5 sm:mt-2.5">
                            {val.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. 예배안내 (Worship) ==================== */}
          {panel === 'worship' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in">
              {/* 모바일 전용 가독성 최적화 카드 뷰 (sm 미만) */}
              <div className="grid grid-cols-1 gap-3 sm:hidden">
                {worshipServices.map((ws, index) => {
                  const match = ws.name.match(/^(.*?)\s*(\(.*\))$/);
                  const mainName = match ? match[1] : ws.name;
                  const subName = match ? match[2] : null;

                  return (
                    <div 
                      key={index} 
                      className="p-4 rounded-2xl bg-white border border-[#2F3E46]/10 shadow-xs flex flex-col justify-between gap-3 hover:border-[#4F6D7A]/30 transition-all"
                    >
                      <div className="space-y-1">
                        <h5 className="font-bold text-[16px] text-[#2F3E46] tracking-tight leading-snug">
                          {mainName}
                        </h5>
                        {subName && (
                          <p className="text-xs text-[#4F6D7A] font-medium leading-normal">
                            {subName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#2F3E46]/5 text-xs">
                        <div className="flex items-center gap-1.5 text-[#4F6D7A] font-semibold bg-[#4F6D7A]/10 px-2.5 py-1 rounded-lg">
                          <Clock size={13} />
                          <span className="font-mono">{ws.time}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#2F3E46]/70 bg-[#2F3E46]/5 px-2.5 py-1 rounded-lg font-medium">
                          <MapPin size={13} className="text-[#4F6D7A]" />
                          <span>{ws.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 태블릿 & 데스크톱 표 가이드 (sm 이상) */}
              <div className="hidden sm:block overflow-hidden rounded-2xl border border-[#2F3E46]/10 shadow-sm bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#4F6D7A]/10 text-[#2F3E46]">
                      <th className="p-4 text-base font-semibold border-b border-[#2F3E46]/10 w-1/2">예배명</th>
                      <th className="p-4 text-base font-semibold border-b border-[#2F3E46]/10 w-1/4">시간</th>
                      <th className="p-4 text-base font-semibold border-b border-[#2F3E46]/10 w-1/4">장소</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2F3E46]/5">
                    {worshipServices.map((ws, index) => {
                      const match = ws.name.match(/^(.*?)\s*(\(.*\))$/);
                      const mainName = match ? match[1] : ws.name;
                      const subName = match ? match[2] : null;

                      return (
                        <tr key={index} className="hover:bg-[#FAF9F6]/80 transition-colors">
                          <td className="p-4 font-medium text-[#2F3E46]">
                            <div className="font-semibold text-[#2F3E46] text-base">{mainName}</div>
                            {subName && (
                              <div className="text-xs text-[#4F6D7A] font-normal mt-0.5">{subName}</div>
                            )}
                          </td>
                          <td className="p-4 font-mono font-medium text-[#4F6D7A] text-base">
                            <div className="flex items-center gap-1.5">
                              <Clock size={15} className="text-[#4F6D7A]/70" />
                              <span>{ws.time}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-[#2F3E46]/80">
                            <div className="flex items-center gap-1">
                              <MapPin size={14} className="text-[#4F6D7A]/70" />
                              <span>{ws.location}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 4. 오시는 길 (Location) ==================== */}
          {panel === 'location' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 items-stretch">
                
                {/* 교통편 안내 카드 */}
                <div className="space-y-4 sm:space-y-6 flex flex-col justify-between">
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="font-serif font-bold text-base sm:text-xl text-[#0B2545] flex items-center gap-2">
                      <MapPin size={18} className="text-[#0096E6] shrink-0 sm:w-5 sm:h-5" />
                      교회 상세 주소 및 연락처
                    </h4>
                    <p className="text-sm sm:text-base font-bold text-[#2F3E46]">
                      강원특별자치도 원주시 지정면 신지정로 184 2층
                    </p>
                    <p className="hidden sm:block text-xs sm:text-sm text-[#2F3E46]/75 leading-relaxed break-keep">
                      원주 기업도시 내 롯데리아 옆 지정타워 2층(맞은편 여운터소공원)에 위치하고 있으며,<br className="hidden sm:inline" />
                      지도 및 길찾기 서비스를 참고하시면 편리하게 오실 수 있습니다.
                    </p>
                    
                    <div className="space-y-3 sm:space-y-4 pt-3.5 sm:pt-5 border-t border-[#2F3E46]/10">
                      <div className="flex items-start gap-2.5 sm:gap-3.5">
                        <div className="text-[11px] sm:text-xs tracking-wider bg-[#0096E6] text-white py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-md sm:rounded-lg font-bold mt-0.5 shrink-0 whitespace-nowrap text-center w-14 sm:w-16 shadow-2xs">
                          버스
                        </div>
                        <div className="text-xs sm:text-sm text-[#2F3E46]/85 leading-relaxed">
                          <strong className="font-semibold text-[#2F3E46]">거울못공원 정류장 하차:</strong> 일반 버스 52-1, 56, 57, 100, 100-2번 하차 후 도보 1~2분
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 sm:gap-3.5">
                        <div className="text-[11px] sm:text-xs tracking-wider bg-[#66C82B] text-white py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-md sm:rounded-lg font-bold mt-0.5 shrink-0 whitespace-nowrap text-center w-14 sm:w-16 shadow-2xs">
                          차량
                        </div>
                        <div className="text-xs sm:text-sm text-[#2F3E46]/85 leading-relaxed">
                          내비게이션에 <strong className="font-semibold text-[#2F3E46]">"원주시 지정면 신지정로 184"</strong> 검색. 영동고속도로 만종 IC에서 진입 시 6분 소요.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 sm:gap-3.5">
                        <div className="text-[11px] sm:text-xs tracking-wider bg-[#0B2545] text-white py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-md sm:rounded-lg font-bold mt-0.5 shrink-0 whitespace-nowrap text-center w-14 sm:w-16 shadow-2xs">
                          주차
                        </div>
                        <div className="text-xs sm:text-sm text-[#2F3E46]/85 leading-relaxed">
                          상가 전용 주차장(지하/지상) 무료 이용 가능. 만차 시 주변 공영 주차장이나 이면 도로 주차 공간 활용.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 약도 비주얼 맵 프레임 */}
                <div className="border border-[#2F3E46]/10 rounded-2xl overflow-hidden min-h-[260px] sm:min-h-[300px] lg:aspect-square bg-[#FAF9F6] flex flex-col relative justify-center items-center p-6 sm:p-8 text-center shadow-2xs">
                  
                  {/* 심플 세련 지도 드로잉 placeholder */}
                  <div className="absolute inset-0 bg-[#FAF9F6] opacity-30 pointer-events-none">
                    {/* 모던 스케치 라인 백그라운드 */}
                    <svg className="w-full h-full text-[#2F3E46]/5" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                      <path d="M0,20 L100,20 M0,50 L100,50 M0,80 L100,80 M30,0 L30,100 M70,0 L70,100" />
                      <circle cx="50" cy="50" r="15" fill="none" strokeWidth="0.5" />
                    </svg>
                  </div>

                  <div className="relative z-10 space-y-3 sm:space-y-4 w-full max-w-sm mx-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#4F6D7A]/10 text-[#4F6D7A] rounded-full flex items-center justify-center mx-auto">
                      <MapPin size={20} className="animate-bounce sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h5 className="font-serif font-bold text-[#2F3E46] text-sm sm:text-base">오병이어 교회 위치 안내</h5>
                      <p className="text-xs sm:text-sm text-[#2F3E46]/70 mt-0.5 sm:mt-1">원주시 지정면 신지정로 184 2층</p>
                    </div>

                    {/* 카카오맵/네이버맵 외부 연동 버튼 제공 */}
                    <div className="flex flex-row flex-wrap gap-2 justify-center pt-1 sm:pt-2">
                      <a
                        href="https://map.kakao.com/?q=%EA%B0%95%EC%9B%90%ED%8A%B9%EB%B3%84%EC%9E%90%EC%B9%90%EB%8F%84%20%EC%9B%90%EC%A3%BC%EC%8B%9C%20%EC%A7%80%EC%A0%95%EB%A9%B4%20%EC%8B%A0%EC%A7%80%EC%A0%95%EB%A1%9C%20184"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#FEE500] hover:bg-[#FEE500]/90 text-xs sm:text-sm text-yellow-950 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 whitespace-nowrap"
                      >
                        카카오맵
                      </a>
                      <a
                        href={`https://map.naver.com/v5/search/${encodeURIComponent('강원특별자치도 원주시 지정면 신지정로 184')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#03C75A] hover:bg-[#02b350] text-xs sm:text-sm text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 whitespace-nowrap"
                      >
                        네이버 지도
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}



          {/* ==================== 6. 오병이어 소식 (Board) ==================== */}
          {(panel === 'board' || panel === 'bulletin') && (
            <div className="space-y-8 animate-fade-in">
              <div className={`grid grid-cols-1 ${user && user.email === '5qud2dj11@gmail.com' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
                
                {/* 왼쪽: 게시글 목록 및 상세 조회 */}
                <div className={`${user && user.email === '5qud2dj11@gmail.com' ? 'lg:col-span-2' : ''} space-y-6`}>
                  
                  {/* 게시판 탭 분기 (모던 세그먼티드 콘트롤 디자인) */}
                  <div className="bg-[#FAF9F6] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-[#2F3E46]/10 flex items-center gap-1 overflow-x-auto scrollbar-none shadow-xs">
                    <button
                      id="board-tab-news"
                      onClick={() => { setPostTab('news'); setSelectedBulletin(null); setSelectedNews(null); setSelectedMembers(null); }}
                      className={`flex-1 min-w-0 px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-[11px] sm:text-sm md:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 sm:shrink ${
                        postTab === 'news'
                          ? 'bg-white text-[#2F3E46] shadow-xs border border-[#2F3E46]/10'
                          : 'text-[#2F3E46]/60 hover:text-[#2F3E46] hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xs sm:text-base">📢</span>
                      <span className="whitespace-nowrap">교회 게시판</span>
                    </button>
                    <button
                      id="board-tab-members"
                      onClick={() => { setPostTab('members'); setSelectedBulletin(null); setSelectedNews(null); setSelectedMembers(null); }}
                      className={`flex-1 min-w-0 px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-[11px] sm:text-sm md:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 sm:shrink ${
                        postTab === 'members'
                          ? 'bg-white text-[#2F3E46] shadow-xs border border-[#2F3E46]/10'
                          : 'text-[#2F3E46]/60 hover:text-[#2F3E46] hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xs sm:text-base">🔒</span>
                      <span className="whitespace-nowrap">교인 전용</span>
                    </button>
                    <button
                      id="board-tab-bulletin"
                      onClick={() => { setPostTab('bulletin'); setSelectedBulletin(null); setSelectedNews(null); setSelectedMembers(null); }}
                      className={`flex-1 min-w-0 px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-[11px] sm:text-sm md:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 sm:shrink ${
                        postTab === 'bulletin'
                          ? 'bg-white text-[#2F3E46] shadow-xs border border-[#2F3E46]/10'
                          : 'text-[#2F3E46]/60 hover:text-[#2F3E46] hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xs sm:text-base">📖</span>
                      <span className="whitespace-nowrap">주일 주보</span>
                    </button>
                    {user && (
                      <button
                        id="board-tab-my"
                        onClick={() => { setPostTab('my'); setSelectedBulletin(null); setSelectedNews(null); setSelectedMembers(null); }}
                        className={`flex-1 min-w-0 px-1.5 sm:px-3 py-1.5 sm:py-2.5 text-[11px] sm:text-sm md:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 sm:shrink ${
                          postTab === 'my'
                            ? 'bg-white text-[#2F3E46] shadow-xs border border-[#2F3E46]/10'
                            : 'text-[#2F3E46]/60 hover:text-[#2F3E46] hover:bg-white/50'
                        }`}
                      >
                        <span className="text-xs sm:text-base">👤</span>
                        <span className="whitespace-nowrap">내 글 ({myPosts.length})</span>
                      </button>
                    )}
                  </div>
                  
                  {/* 게시글 목록 렌더링 */}
                  <div ref={boardScrollContainerRef} className="space-y-4 max-h-[700px] overflow-y-auto pr-1 sm:pr-2">
                    {postTab === 'news' && (
                      selectedNews ? (
                        /* 개별 교회 소식 / 공지 상세 보기 */
                        <div className="p-4 sm:p-6 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-md space-y-4 sm:space-y-6 animate-fade-in">
                          <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-[#2F3E46]/10 gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] sm:text-xs font-bold bg-[#4F6D7A]/10 text-[#4F6D7A] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase tracking-wider">교회 소식 상세</span>
                            </div>
                            <button
                              id="btn-back-to-news-list-top"
                              onClick={() => setSelectedNews(null)}
                              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#FAF9F6] border border-[#2F3E46]/15 hover:border-[#4F6D7A]/40 hover:bg-[#4F6D7A]/5 text-xs sm:text-sm font-semibold text-[#4F6D7A] rounded-full transition-all shadow-sm cursor-pointer shrink-0"
                            >
                              <ArrowLeft size={13} className="sm:w-3.5 sm:h-3.5" />
                              <span>목록으로</span>
                            </button>
                          </div>

                          <div className="space-y-3 sm:space-y-4">
                            <h5 className="font-serif font-bold text-base sm:text-lg md:text-xl text-[#2F3E46] leading-snug">{selectedNews.title}</h5>
                            
                            <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-[#2F3E46]/60 bg-[#FAF9F6] p-2.5 sm:p-3 rounded-xl border border-[#2F3E46]/5">
                              {selectedNews.userPhoto ? (
                                <img src={selectedNews.userPhoto} alt={selectedNews.userName} className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 bg-[#4F6D7A]/10 text-[#4F6D7A] text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold shrink-0">
                                  {selectedNews.userName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="font-semibold block text-[#2F3E46]">{selectedNews.userName}</span>
                                <span className="text-[10px] sm:text-xs text-[#2F3E46]/40 font-mono">게시일: {new Date(selectedNews.createdAt).toLocaleString('ko-KR')}</span>
                              </div>
                            </div>

                            <div className="p-4 sm:p-5 md:p-6 bg-[#FAF9F6]/50 border border-[#2F3E46]/5 rounded-xl">
                              <p className="text-xs sm:text-sm md:text-base text-[#2F3E46]/85 leading-relaxed font-sans whitespace-pre-wrap">
                                {selectedNews.content}
                              </p>
                            </div>

                            <div className="pt-4 sm:pt-6 border-t border-[#2F3E46]/10 flex justify-center">
                              <button
                                id="btn-back-to-news-list-bottom"
                                onClick={() => setSelectedNews(null)}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-[#4F6D7A] hover:bg-[#3d5560] active:scale-95 text-xs sm:text-sm font-bold text-white rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
                              >
                                <ArrowLeft size={15} />
                                <span>글 읽기 완료 (목록으로 돌아가기)</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                            <h6 className="font-serif font-bold text-xs text-[#2F3E46] flex items-center gap-1.5">
                              <BookOpen size={14} className="text-[#4F6D7A] shrink-0" />
                              역대 교회 소식 목록 ({yearlyFilteredNews.length}개 / 전체 {newsPosts.length}개)
                            </h6>
                          </div>

                          {/* 교회 소식 검색바 */}
                          {newsPosts.length > 0 && (
                            <div className="relative mb-2 animate-fade-in">
                              <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-[#2F3E46]/40" />
                              <input
                                type="text"
                                value={newsSearchQuery}
                                onChange={(e) => {
                                  setNewsSearchQuery(e.target.value);
                                  setNewsPage(1);
                                }}
                                placeholder="역대 교회 게시판 검색..."
                                className="w-full pl-8.5 sm:pl-9 pr-4 py-2 sm:py-2.5 bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4F6D7A]"
                              />
                            </div>
                          )}

                          {/* 연도별 필터 버튼 */}
                          {newsYears.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-1 px-1">
                              <span className="text-xs font-bold text-[#2F3E46]/55 mr-1">연도별:</span>
                              <button
                                type="button"
                                id="btn-news-year-filter-all"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedNewsYear('All');
                                  setNewsPage(1);
                                  scrollToBoardTop();
                                }}
                                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                                  selectedNewsYear === 'All'
                                    ? 'bg-[#4F6D7A] text-white border-[#4F6D7A]'
                                    : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30'
                                }`}
                              >
                                전체
                              </button>
                              {newsYears.map(year => (
                                <button
                                  type="button"
                                  key={year}
                                  id={`btn-news-year-filter-${year}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedNewsYear(year.toString());
                                    setNewsPage(1);
                                    scrollToBoardTop();
                                  }}
                                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                                    selectedNewsYear === year.toString()
                                      ? 'bg-[#4F6D7A] text-white border-[#4F6D7A]'
                                      : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30'
                                  }`}
                                >
                                  {year}년
                                </button>
                              ))}
                            </div>
                          )}

                          {displayedNews.length === 0 ? (
                            <div className="text-center py-10 text-xs sm:text-sm text-[#2F3E46]/40 bg-white border border-[#2F3E46]/5 rounded-2xl">
                              {newsSearchQuery ? '검색 결과에 맞는 교회 소식이 없습니다.' : '등록된 교회 소식이 없습니다.'}
                            </div>
                          ) : (
                            <div className="space-y-3 sm:space-y-4">
                              {[...displayedNews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((post, index) => (
                                <div
                                  key={post.id || index}
                                  onClick={() => setSelectedNews(post)}
                                  className="p-3.5 sm:p-5 border border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 bg-white rounded-2xl transition-all shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.98] relative group"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      {post.userPhoto ? (
                                        <img src={post.userPhoto} alt={post.userName} className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 bg-[#4F6D7A]/10 text-[#4F6D7A] text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold shrink-0">
                                          {post.userName.charAt(0)}
                                        </div>
                                      )}
                                      <span className="text-xs sm:text-sm font-semibold text-[#2F3E46] truncate max-w-[130px] sm:max-w-none">
                                        {post.userName}
                                      </span>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-[#2F3E46]/40 font-mono shrink-0">
                                      {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                  </div>
                                  <h5 className="font-bold text-sm sm:text-base text-[#2F3E46] mb-1 sm:mb-2 group-hover:text-[#4F6D7A] transition-colors flex items-center gap-1.5 flex-wrap">
                                    <span>{post.title}</span>
                                    <span className="hidden sm:inline-block text-xs font-normal text-[#4F6D7A]/70 opacity-0 group-hover:opacity-100 transition-opacity">클릭하여 자세히 보기 &rarr;</span>
                                  </h5>
                                  <p className="text-xs sm:text-sm text-[#2F3E46]/75 leading-relaxed font-light whitespace-pre-line line-clamp-2 sm:line-clamp-3">{post.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 페이지네이션 1 2 3 */}
                          {totalNewsPages > 1 && (
                            <div className="flex items-center justify-center gap-1.5 pt-4">
                              <button
                                type="button"
                                disabled={currentNewsPage === 1}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setNewsPage(prev => Math.max(1, prev - 1));
                                  scrollToBoardTop();
                                }}
                                className="p-2 text-xs text-[#2F3E46]/70 hover:text-[#4F6D7A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-lg transition-all"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              {Array.from({ length: totalNewsPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                  type="button"
                                  key={pageNum}
                                  id={`btn-news-page-${pageNum}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setNewsPage(pageNum);
                                    scrollToBoardTop();
                                  }}
                                  className={`w-8 h-8 text-xs font-mono font-bold rounded-lg transition-all border flex items-center justify-center cursor-pointer ${
                                    currentNewsPage === pageNum
                                      ? 'bg-[#4F6D7A] text-white border-[#4F6D7A] shadow-sm'
                                      : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 hover:bg-white'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              ))}
                              <button
                                type="button"
                                disabled={currentNewsPage === totalNewsPages}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setNewsPage(prev => Math.min(totalNewsPages, prev + 1));
                                  scrollToBoardTop();
                                }}
                                className="p-2 text-xs text-[#2F3E46]/70 hover:text-[#4F6D7A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-lg transition-all"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {postTab === 'members' && (
                      !isMembersUnlocked ? (
                        /* 교인 전용 게시판 비밀번호 잠금 화면 */
                        <div className="p-8 sm:p-12 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-sm text-center max-w-md mx-auto my-6 space-y-6 animate-fade-in">
                          <div className="w-16 h-16 bg-[#4F6D7A]/10 text-[#4F6D7A] rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Lock size={32} />
                          </div>
                          <div className="space-y-2">
                            <h5 className="font-serif font-bold text-xl text-[#2F3E46]">교인 전용 게시판 인증</h5>
                            <p className="text-xs sm:text-sm text-[#2F3E46]/70 leading-relaxed">
                              오병이어교회 성도님 전용 공간입니다.<br />
                              비밀번호를 입력하시면 게시판을 이용하실 수 있습니다.
                            </p>
                          </div>

                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              
                              const now = Date.now();
                              if (lockoutUntil > now) {
                                const remainingText = getRemainingLockoutText(lockoutUntil);
                                setMembersPasswordError(`비밀번호 10회 연속 실패로 입력이 제한되었습니다. (${remainingText} 후 재시도)`);
                                return;
                              }

                              if (membersPasswordInput.trim() === '0801') {
                                setIsMembersUnlocked(true);
                                localStorage.setItem('isMembersUnlocked', 'true');
                                setFailedAttempts(0);
                                localStorage.removeItem('pw_failed_attempts');
                                setLockoutUntil(0);
                                localStorage.removeItem('pw_lockout_until');
                                setMembersPasswordError('');
                                setMembersPasswordInput('');

                                if (auth.currentUser) {
                                  try {
                                    await setDoc(doc(db, 'users', auth.currentUser.uid), {
                                      isMembersUnlocked: true,
                                      failedAttempts: 0,
                                      lockoutUntil: '',
                                      email: auth.currentUser.email || '',
                                      displayName: auth.currentUser.displayName || '',
                                      unlockedAt: new Date().toISOString()
                                    }, { merge: true });
                                  } catch (err) {
                                    console.error('구글 계정 인증 정보 저장 오류:', err);
                                  }
                                }
                              } else {
                                const newAttempts = failedAttempts + 1;
                                setFailedAttempts(newAttempts);
                                localStorage.setItem('pw_failed_attempts', newAttempts.toString());

                                if (newAttempts >= 10) {
                                  const sixHoursLater = Date.now() + 6 * 60 * 60 * 1000;
                                  setLockoutUntil(sixHoursLater);
                                  localStorage.setItem('pw_lockout_until', sixHoursLater.toString());
                                  const isoLockout = new Date(sixHoursLater).toISOString();
                                  setMembersPasswordError('비밀번호를 10회 연속 틀렸습니다. 6시간 동안 입력을 할 수 없습니다.');

                                  if (auth.currentUser) {
                                    try {
                                      await setDoc(doc(db, 'users', auth.currentUser.uid), {
                                        failedAttempts: newAttempts,
                                        lockoutUntil: isoLockout
                                      }, { merge: true });
                                    } catch (err) {
                                      console.error('구글 계정 잠금 정보 저장 오류:', err);
                                    }
                                  }
                                } else {
                                  const remaining = 10 - newAttempts;
                                  setMembersPasswordError(`비밀번호가 올바르지 않습니다. (남은 시도 횟수: ${remaining}/10회)`);

                                  if (auth.currentUser) {
                                    try {
                                      await setDoc(doc(db, 'users', auth.currentUser.uid), {
                                        failedAttempts: newAttempts
                                      }, { merge: true });
                                    } catch (err) {
                                      console.error('구글 계정 실패 횟수 저장 오류:', err);
                                    }
                                  }
                                }
                              }
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <input
                                type="password"
                                autoFocus
                                disabled={lockoutUntil > Date.now()}
                                value={membersPasswordInput}
                                onChange={(e) => {
                                  setMembersPasswordInput(e.target.value);
                                  if (membersPasswordError) setMembersPasswordError('');
                                }}
                                placeholder={lockoutUntil > Date.now() ? "입력 제한 상태" : "비밀번호 입력"}
                                className={`w-full text-center px-4 py-3 bg-[#FAF9F6] border ${
                                  membersPasswordError ? 'border-red-400 focus:ring-red-400' : 'border-[#2F3E46]/20 focus:ring-[#4F6D7A]'
                                } rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed`}
                              />
                              {membersPasswordError ? (
                                <p className="text-xs text-red-500 font-semibold mt-1.5 break-keep">
                                  {membersPasswordError}
                                </p>
                              ) : lockoutUntil > Date.now() ? (
                                <p className="text-xs text-red-500 font-semibold mt-1.5 break-keep">
                                  🔒 10회 입력 실패로 6시간 제한 적용 중 ({getRemainingLockoutText(lockoutUntil)} 남음)
                                </p>
                              ) : failedAttempts > 0 ? (
                                <p className="text-xs text-[#D97706] font-medium mt-1.5">
                                  ⚠️ 남은 시도 횟수: {10 - failedAttempts}/10회
                                </p>
                              ) : null}
                            </div>

                            <button
                              type="submit"
                              id="btn-unlock-members-board"
                              disabled={lockoutUntil > Date.now()}
                              className="w-full py-3 bg-[#4F6D7A] hover:bg-[#3d5560] text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              <Unlock size={16} />
                              <span>{lockoutUntil > Date.now() ? '비밀번호 입력 제한됨' : '비밀번호 인증하기'}</span>
                            </button>

                            <p className="text-[11px] text-[#2F3E46]/60 pt-1 leading-normal">
                              💡 구글 로그인 후 1회 인증을 완료하시면,<br />
                              모든 기기 및 환경에서 재입력 없이 자동 이용 가능합니다.
                            </p>
                          </form>
                        </div>
                      ) : (
                        selectedMembers ? (
                          /* 개별 교인 전용 게시글 상세 보기 */
                          <div className="p-4 sm:p-6 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-md space-y-4 sm:space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-[#2F3E46]/10 gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] sm:text-xs font-bold bg-[#4F6D7A]/10 text-[#4F6D7A] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase tracking-wider">교인 전용 상세</span>
                              </div>
                              <button
                                id="btn-back-to-members-list-top"
                                onClick={() => setSelectedMembers(null)}
                                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#FAF9F6] border border-[#2F3E46]/15 hover:border-[#4F6D7A]/40 hover:bg-[#4F6D7A]/5 text-xs sm:text-sm font-semibold text-[#4F6D7A] rounded-full transition-all shadow-sm cursor-pointer shrink-0"
                              >
                                <ArrowLeft size={13} className="sm:w-3.5 sm:h-3.5" />
                                <span>목록으로</span>
                              </button>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                              <h5 className="font-serif font-bold text-base sm:text-lg md:text-xl text-[#2F3E46] leading-snug">{selectedMembers.title}</h5>
                              
                              <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-[#2F3E46]/60 bg-[#FAF9F6] p-2.5 sm:p-3 rounded-xl border border-[#2F3E46]/5">
                                {selectedMembers.userPhoto ? (
                                  <img src={selectedMembers.userPhoto} alt={selectedMembers.userName} className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 bg-[#4F6D7A]/10 text-[#4F6D7A] text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold shrink-0">
                                    {selectedMembers.userName.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold block text-[#2F3E46]">{selectedMembers.userName}</span>
                                  <span className="text-[10px] sm:text-xs text-[#2F3E46]/40 font-mono">게시일: {new Date(selectedMembers.createdAt).toLocaleString('ko-KR')}</span>
                                </div>
                              </div>

                              <div className="p-4 sm:p-5 md:p-6 bg-[#FAF9F6]/50 border border-[#2F3E46]/5 rounded-xl">
                                <p className="text-xs sm:text-sm md:text-base text-[#2F3E46]/85 leading-relaxed font-sans whitespace-pre-wrap">
                                  {selectedMembers.content}
                                </p>
                              </div>

                              <div className="pt-4 sm:pt-6 border-t border-[#2F3E46]/10 flex justify-center">
                                <button
                                  id="btn-back-to-members-list-bottom"
                                  onClick={() => setSelectedMembers(null)}
                                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-[#4F6D7A] hover:bg-[#3d5560] active:scale-95 text-xs sm:text-sm font-bold text-white rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
                                >
                                  <ArrowLeft size={15} />
                                  <span>글 읽기 완료 (목록으로 돌아가기)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                              <h6 className="font-serif font-bold text-xs text-[#2F3E46] flex items-center gap-1.5">
                                <BookOpen size={14} className="text-[#4F6D7A] shrink-0" />
                                역대 교인 전용 게시글 목록 ({yearlyFilteredMembers.length}개 / 전체 {membersPosts.length}개)
                              </h6>
                              <button
                                type="button"
                                id="btn-relock-members-board"
                                onClick={async () => {
                                  setIsMembersUnlocked(false);
                                  localStorage.removeItem('isMembersUnlocked');
                                  setSelectedMembers(null);
                                  if (auth.currentUser) {
                                    try {
                                      await setDoc(doc(db, 'users', auth.currentUser.uid), {
                                        isMembersUnlocked: false
                                      }, { merge: true });
                                    } catch (err) {
                                      console.error('구글 계정 잠금 처리 오류:', err);
                                    }
                                  }
                                }}
                                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold text-[#4F6D7A] bg-[#4F6D7A]/10 hover:bg-[#4F6D7A]/20 rounded-full transition-all cursor-pointer w-fit"
                              >
                                <Lock size={12} />
                                <span>다시 잠그기</span>
                              </button>
                            </div>

                            {/* 교인 전용 검색바 */}
                            {membersPosts.length > 0 && (
                              <div className="relative mb-2 animate-fade-in">
                                <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-[#2F3E46]/40" />
                                <input
                                  type="text"
                                  value={membersSearchQuery}
                                  onChange={(e) => {
                                    setMembersSearchQuery(e.target.value);
                                    setMembersPage(1);
                                  }}
                                  placeholder="역대 교인 전용 게시판 검색..."
                                  className="w-full pl-8.5 sm:pl-9 pr-4 py-2 sm:py-2.5 bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4F6D7A]"
                                />
                              </div>
                            )}

                            {/* 연도별 필터 버튼 */}
                            {membersYears.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-1 px-1">
                                <span className="text-xs font-bold text-[#2F3E46]/55 mr-1">연도별:</span>
                                <button
                                  type="button"
                                  id="btn-members-year-filter-all"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedMembersYear('All');
                                    setMembersPage(1);
                                    scrollToBoardTop();
                                  }}
                                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                                    selectedMembersYear === 'All'
                                      ? 'bg-[#4F6D7A] text-white border-[#4F6D7A]'
                                      : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30'
                                  }`}
                                >
                                  전체
                                </button>
                                {membersYears.map(year => (
                                  <button
                                    type="button"
                                    key={year}
                                    id={`btn-members-year-filter-${year}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedMembersYear(year.toString());
                                      setMembersPage(1);
                                      scrollToBoardTop();
                                    }}
                                    className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                                      selectedMembersYear === year.toString()
                                        ? 'bg-[#4F6D7A] text-white border-[#4F6D7A]'
                                        : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30'
                                    }`}
                                  >
                                    {year}년
                                  </button>
                                ))}
                              </div>
                            )}

                            {displayedMembers.length === 0 ? (
                              <div className="text-center py-10 text-xs sm:text-sm text-[#2F3E46]/40 bg-white border border-[#2F3E46]/5 rounded-2xl">
                                {membersSearchQuery ? '검색 결과에 맞는 교인 전용 게시글이 없습니다.' : '등록된 교인 전용 게시글이 없습니다.'}
                              </div>
                            ) : (
                              <div className="space-y-3 sm:space-y-4">
                                {displayedMembers.map((post, index) => (
                                  <div
                                    key={post.id || index}
                                    onClick={() => setSelectedMembers(post)}
                                    className="p-3.5 sm:p-5 border border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 bg-white rounded-2xl transition-all shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.98] relative group"
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                                      <div className="flex items-center gap-1.5 sm:gap-2">
                                        {post.userPhoto ? (
                                          <img src={post.userPhoto} alt={post.userName} className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 bg-[#4F6D7A]/10 text-[#4F6D7A] text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold shrink-0">
                                            {post.userName.charAt(0)}
                                          </div>
                                        )}
                                        <span className="text-xs sm:text-sm font-semibold text-[#2F3E46] truncate max-w-[130px] sm:max-w-none">
                                          {post.userName}
                                        </span>
                                      </div>
                                      <span className="text-[10px] sm:text-xs text-[#2F3E46]/40 font-mono shrink-0">
                                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-sm sm:text-base text-[#2F3E46] mb-1 sm:mb-2 group-hover:text-[#4F6D7A] transition-colors flex items-center gap-1.5 flex-wrap">
                                      <span>{post.title}</span>
                                      <span className="hidden sm:inline-block text-xs font-normal text-[#4F6D7A]/70 opacity-0 group-hover:opacity-100 transition-opacity">클릭하여 자세히 보기 &rarr;</span>
                                    </h5>
                                    <p className="text-xs sm:text-sm text-[#2F3E46]/75 leading-relaxed font-light whitespace-pre-line line-clamp-2 sm:line-clamp-3">{post.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 페이지네이션 1 2 3 */}
                            {totalMembersPages > 1 && (
                              <div className="flex items-center justify-center gap-1.5 pt-4">
                                <button
                                  type="button"
                                  disabled={currentMembersPage === 1}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setMembersPage(prev => Math.max(1, prev - 1));
                                    scrollToBoardTop();
                                  }}
                                  className="p-2 text-xs text-[#2F3E46]/70 hover:text-[#4F6D7A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-lg transition-all"
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalMembersPages }, (_, i) => i + 1).map((pageNum) => (
                                  <button
                                    type="button"
                                    key={pageNum}
                                    id={`btn-members-page-${pageNum}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setMembersPage(pageNum);
                                      scrollToBoardTop();
                                    }}
                                    className={`w-8 h-8 text-xs font-mono font-bold rounded-lg transition-all border flex items-center justify-center cursor-pointer ${
                                      currentMembersPage === pageNum
                                        ? 'bg-[#4F6D7A] text-white border-[#4F6D7A] shadow-sm'
                                        : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 hover:bg-white'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  disabled={currentMembersPage === totalMembersPages}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setMembersPage(prev => Math.min(totalMembersPages, prev + 1));
                                    scrollToBoardTop();
                                  }}
                                  className="p-2 text-xs text-[#2F3E46]/70 hover:text-[#4F6D7A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-lg transition-all"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      )
                    )}

                    {postTab === 'bulletin' && (
                      selectedBulletin ? (
                        /* 개별 주보 상세 보기 */
                        <div className="p-4 sm:p-6 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-md space-y-4 sm:space-y-6 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#2F3E46]/10">
                            <h5 className="font-serif font-bold text-base sm:text-lg md:text-xl text-[#2F3E46] leading-snug break-keep">{selectedBulletin.title}</h5>
                            <button
                              id="btn-back-to-bulletin-list-top"
                              onClick={() => setSelectedBulletin(null)}
                              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#FAF9F6] border border-[#2F3E46]/15 hover:border-[#4F6D7A]/40 hover:bg-[#4F6D7A]/5 text-xs sm:text-sm font-semibold text-[#4F6D7A] rounded-full transition-all shadow-sm cursor-pointer shrink-0 w-fit whitespace-nowrap self-start sm:self-auto"
                            >
                              <ArrowLeft size={14} />
                              <span>목록으로 돌아가기</span>
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3.5 sm:p-4 bg-[#FAF9F6] border border-[#2F3E46]/5 rounded-xl">
                              <span className="text-[10px] sm:text-xs font-bold text-[#4F6D7A] uppercase tracking-wider block mb-1">금주의 말씀</span>
                              <p className="font-serif text-xs sm:text-sm italic text-[#2F3E46]">"{selectedBulletin.scripture || '선포된 말씀이 없습니다.'}"</p>
                            </div>
                            <div className="p-3.5 sm:p-4 bg-[#FAF9F6] border border-[#2F3E46]/5 rounded-xl">
                              <span className="text-[10px] sm:text-xs font-bold text-[#4F6D7A] uppercase tracking-wider block mb-1">대표 기도자</span>
                              <p className="text-xs sm:text-sm font-bold text-[#2F3E46]">{selectedBulletin.prayer || '지정되지 않음'}</p>
                            </div>
                          </div>

                          {/* 주보 사진 뷰어 */}
                           {selectedBulletin.images && selectedBulletin.images.length > 0 ? (
                            <div className="space-y-4 sm:space-y-6 bg-[#FAF9F6] p-3 sm:p-6 rounded-2xl border border-[#2F3E46]/5 flex flex-col items-center">
                              <p className="text-[11px] sm:text-xs text-[#2F3E46]/60 text-center flex items-center justify-center gap-1">
                                <Info size={13} className="text-[#4F6D7A] shrink-0" />
                                <span>사진을 터치 또는 클릭하시면 원본 크기로 선명하게 확대하여 읽으실 수 있습니다.</span>
                              </p>
                              {selectedBulletin.images.map((img, idx) => (
                                <div key={idx} className="w-full max-w-xl bg-white rounded-xl shadow-sm border border-[#2F3E46]/10 overflow-hidden relative group">
                                  <img
                                    src={img}
                                    alt={`${selectedBulletin.title} - ${idx + 1}쪽`}
                                    onClick={() => setActiveLightboxImage(img)}
                                    className="w-full h-auto object-contain cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded">
                                    {idx + 1} / {selectedBulletin.images.length} 쪽
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 sm:p-8 text-center bg-[#FAF9F6] border border-[#2F3E46]/5 rounded-2xl text-xs sm:text-sm text-[#2F3E46]/50">
                              등록된 주보 지면 사진이 없습니다.
                            </div>
                          )}
                          
                          <div className="text-[10px] sm:text-xs text-right text-[#2F3E46]/50">
                            게시일: {new Date(selectedBulletin.createdAt).toLocaleString('ko-KR')} | 작성자: {selectedBulletin.userName}
                          </div>

                          <div className="pt-4 sm:pt-6 border-t border-[#2F3E46]/10 flex justify-center">
                            <button
                              id="btn-back-to-bulletin-list-bottom"
                              onClick={() => setSelectedBulletin(null)}
                              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-[#4F6D7A] hover:bg-[#3d5560] active:scale-95 text-xs sm:text-sm font-bold text-white rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
                            >
                              <ArrowLeft size={15} />
                              <span>주보 읽기 완료 (전체 목록으로 돌아가기)</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 주보 목록 및 가장 최신 주보 메인 노출 */
                        <div className="space-y-4 sm:space-y-6">
                          {bulletinPosts.length > 0 && (
                            <div className="p-4 sm:p-6 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-sm space-y-3 sm:space-y-4">
                              <span className="text-[10px] sm:text-xs font-bold bg-[#4F6D7A]/10 text-[#4F6D7A] px-2.5 py-1 rounded-full uppercase tracking-wider">가장 최근 주보</span>
                              <h5 className="font-serif font-bold text-base sm:text-lg md:text-xl text-[#2F3E46] mt-1 sm:mt-2">{bulletinPosts[0].title}</h5>
                              {bulletinPosts[0].images && bulletinPosts[0].images.length > 0 && (
                                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#4F6D7A] bg-[#4F6D7A]/5 border border-[#4F6D7A]/15 px-2 sm:px-2.5 py-1 rounded-lg w-fit font-medium">
                                  <Image size={13} />
                                  <span>지면 주보 사진 {bulletinPosts[0].images.length}장 수록됨</span>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 my-2">
                                <div className="p-2.5 sm:p-3 bg-[#FAF9F6] border border-[#2F3E46]/5 rounded-xl text-xs sm:text-sm">
                                  <strong className="text-[#4F6D7A] block mb-0.5 sm:mb-1">말씀 구절:</strong>
                                  <span className="italic">"{bulletinPosts[0].scripture || '요한복음 6장 35절'}"</span>
                                </div>
                                <div className="p-2.5 sm:p-3 bg-[#FAF9F6] border border-[#2F3E46]/5 rounded-xl text-xs sm:text-sm">
                                  <strong className="text-[#4F6D7A] block mb-0.5 sm:mb-1">대표 기도자:</strong>
                                  <span>{bulletinPosts[0].prayer || '이우진 장로'}</span>
                                </div>
                              </div>

                              {bulletinPosts[0].images && bulletinPosts[0].images.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-[#2F3E46]/5">
                                  <span className="text-[11px] sm:text-xs font-bold text-[#4F6D7A] uppercase tracking-wider block">지면 주보 미리보기 ({bulletinPosts[0].images.length}장)</span>
                                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                                    {bulletinPosts[0].images.map((img, idx) => (
                                      <div 
                                        key={idx} 
                                        onClick={() => {
                                          setSelectedBulletin(bulletinPosts[0]);
                                          setBulletinViewMode('image');
                                        }}
                                        className="relative h-24 sm:h-28 aspect-[3/4] rounded-lg overflow-hidden border border-[#2F3E46]/10 shadow-sm cursor-zoom-in hover:scale-105 active:scale-95 transition-all shrink-0"
                                      >
                                        <img src={img} alt={`page-${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                          {idx + 1}쪽
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => setSelectedBulletin(bulletinPosts[0])}
                                className="w-full py-2.5 bg-[#FAF9F6] hover:bg-[#4F6D7A]/5 border border-[#4F6D7A]/20 text-[#4F6D7A] text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {bulletinPosts[0].images && bulletinPosts[0].images.length > 0 ? (
                                  <>
                                    <Image size={14} />
                                    <span>지면 주보 사진 보기</span>
                                  </>
                                ) : (
                                  <span>이 주보 보기</span>
                                )}
                              </button>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                              <h6 className="font-serif font-bold text-xs sm:text-sm text-[#2F3E46] flex items-center gap-1.5">
                                <BookOpen size={14} className="text-[#4F6D7A] shrink-0" />
                                역대 주보 목록 ({yearlyFilteredBulletins.length}개 / 전체 {bulletinPosts.length}개)
                              </h6>
                            </div>

                            {/* 역대 주보 검색바 */}
                            {bulletinPosts.length > 0 && (
                              <div className="relative mb-2 animate-fade-in">
                                <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-[#2F3E46]/40" />
                                <input
                                  type="text"
                                  value={bulletinSearchQuery}
                                  onChange={(e) => {
                                    setBulletinSearchQuery(e.target.value);
                                    setBulletinPage(1);
                                  }}
                                  placeholder="역대 주보 제목, 본문, 말씀 구절 등 검색..."
                                  className="w-full pl-8.5 sm:pl-9 pr-4 py-2 sm:py-2.5 bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#4F6D7A]"
                                />
                              </div>
                            )}

                            {/* 연도별 필터 버튼 */}
                            {bulletinYears.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-1 px-1">
                                <span className="text-xs font-bold text-[#2F3E46]/55 mr-1">연도별:</span>
                                <button
                                  type="button"
                                  id="btn-year-filter-all"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedBulletinYear('All');
                                    setBulletinPage(1);
                                    scrollToBoardTop();
                                  }}
                                  className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                                    selectedBulletinYear === 'All'
                                      ? 'bg-[#4F6D7A] text-white border-[#4F6D7A]'
                                      : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30'
                                  }`}
                                >
                                  전체
                                </button>
                                {bulletinYears.map(year => (
                                  <button
                                    type="button"
                                    key={year}
                                    id={`btn-year-filter-${year}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedBulletinYear(year.toString());
                                      setBulletinPage(1);
                                      scrollToBoardTop();
                                    }}
                                    className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full transition-all border ${
                                      selectedBulletinYear === year.toString()
                                        ? 'bg-[#4F6D7A] text-white border-[#4F6D7A]'
                                        : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30'
                                    }`}
                                  >
                                    {year}년
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {displayedBulletins.length === 0 ? (
                              <div className="text-center py-12 px-4 text-xs sm:text-sm text-[#2F3E46]/60 bg-white border border-[#2F3E46]/10 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-2xs">
                                <BookOpen size={24} className="text-[#2F3E46]/30 mb-0.5" />
                                <span>{bulletinSearchQuery ? '검색 결과에 맞는 주보가 없습니다.' : '등록된 주보가 없습니다.'}</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 animate-fade-in">
                                {displayedBulletins.map((bulletin, idx) => (
                                  <div
                                    key={bulletin.id || idx}
                                    onClick={() => setSelectedBulletin(bulletin)}
                                    className="p-3 sm:p-4 bg-white border border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-between gap-2.5 sm:gap-4"
                                  >
                                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                      <div className="p-1.5 sm:p-2 bg-[#4F6D7A]/5 text-[#4F6D7A] rounded-lg shrink-0">
                                        <BookOpen size={16} className="sm:w-4.5 sm:h-4.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="font-serif font-bold text-xs sm:text-base text-[#2F3E46] truncate">{bulletin.title}</h5>
                                        <p className="text-[11px] sm:text-sm text-[#2F3E46]/60 mt-0.5 sm:mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5">
                                          <span className="truncate">기도: {bulletin.prayer || '지정 안됨'}</span>
                                          {bulletin.images && bulletin.images.length > 0 && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-[#4F6D7A] bg-[#4F6D7A]/5 px-1.5 py-0.5 rounded shrink-0">
                                              <Image size={10} />
                                              사진 {bulletin.images.length}장
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-[#2F3E46]/40 font-mono shrink-0">
                                      {new Date(bulletin.createdAt).toLocaleDateString('ko-KR')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                             {/* 페이지네이션 1 2 3 */}
                             {totalBulletinPages > 1 && (
                               <div className="flex items-center justify-center gap-1.5 pt-4">
                                 <button
                                   type="button"
                                   disabled={currentBulletinPage === 1}
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setBulletinPage(prev => Math.max(1, prev - 1));
                                     scrollToBoardTop();
                                   }}
                                   className="p-2 text-xs text-[#2F3E46]/70 hover:text-[#4F6D7A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-lg transition-all"
                                 >
                                   <ChevronLeft size={16} />
                                 </button>
                                 {Array.from({ length: totalBulletinPages }, (_, i) => i + 1).map((pageNum) => (
                                   <button
                                     type="button"
                                     key={pageNum}
                                     id={`btn-bulletin-page-${pageNum}`}
                                     onClick={(e) => {
                                       e.preventDefault();
                                       setBulletinPage(pageNum);
                                       scrollToBoardTop();
                                     }}
                                     className={`w-8 h-8 text-xs font-mono font-bold rounded-lg transition-all border flex items-center justify-center cursor-pointer ${
                                       currentBulletinPage === pageNum
                                         ? 'bg-[#4F6D7A] text-white border-[#4F6D7A] shadow-sm'
                                         : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 hover:bg-white'
                                     }`}
                                   >
                                     {pageNum}
                                   </button>
                                 ))}
                                 <button
                                   type="button"
                                   disabled={currentBulletinPage === totalBulletinPages}
                                   onClick={(e) => {
                                     e.preventDefault();
                                     setBulletinPage(prev => Math.min(totalBulletinPages, prev + 1));
                                     scrollToBoardTop();
                                   }}
                                   className="p-2 text-xs text-[#2F3E46]/70 hover:text-[#4F6D7A] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-[#FAF9F6] border border-[#2F3E46]/10 rounded-lg transition-all"
                                 >
                                   <ChevronRight size={16} />
                                 </button>
                               </div>
                             )}
                          </div>
                        </div>
                      )
                    )}

                    {postTab === 'my' && (
                      myPosts.length === 0 ? (
                        <div className="text-center py-10 text-xs text-[#2F3E46]/40 bg-white border border-[#2F3E46]/5 rounded-2xl">
                          아직 직접 등록하신 글 내역이 없습니다.
                        </div>
                      ) : (
                        myPosts.map((post) => (
                          <div key={post.id} className="p-5 border border-[#2F3E46]/10 bg-white rounded-2xl relative shadow-sm">
                            <button
                              id={`btn-delete-post-${post.id}`}
                              onClick={() => handlePostDelete(post.id)}
                              className="absolute top-4 right-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제하기"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-[#4F6D7A]/10 text-[#4F6D7A] px-2 py-0.5 rounded font-semibold">
                                  {post.type === 'bulletin' ? '주보' : post.type === 'members' ? '교인 전용' : '교회 소식'}
                                </span>
                                <span className="text-xs font-semibold text-[#2F3E46]">{post.userName}</span>
                              </div>
                            </div>
                            <h5 className="font-bold text-sm text-[#2F3E46] mb-2 pr-6">{post.title}</h5>
                            <p className="text-xs text-[#2F3E46]/75 leading-relaxed font-light mb-2 whitespace-pre-line">{post.content}</p>
                            <span className="text-[10px] text-[#2F3E46]/45 block">신청일: {new Date(post.createdAt).toLocaleString()}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>

                </div>

                {/* 오른쪽 1열: 글 등록 신청 폼 (교회 관리자 전용 노출) */}
                {user && user.email === '5qud2dj11@gmail.com' && (
                  <div className="bg-[#FAF9F6] border border-[#2F3E46]/10 p-6 rounded-2xl h-fit relative animate-fade-in">
                    {postTab === 'bulletin' ? (
                      /* 주보 업로드 폼 */
                      <form onSubmit={handlePostSubmit} className="space-y-4">
                        <h4 className="font-serif font-bold text-sm text-[#4F6D7A] flex items-center gap-1.5 mb-1">
                          <BookOpen size={16} />
                          주일 주보 업로드
                        </h4>
                        <p className="text-[11px] text-[#2F3E46]/60">매주 발행되는 주보 예배 일정과 말씀 구절, 찬송 및 교회 광고 내용을 업로드하여 성도들이 언제든 볼 수 있게 하세요.</p>

                        <div>
                          <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">주보 제목 *</label>
                          <input
                            type="text"
                            required
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder="2026년 7월 26일 주일 예배 주보"
                            className="w-full p-2.5 bg-white border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">예배 일자 *</label>
                            <input
                              type="text"
                              required
                              value={bulletinDate}
                              onChange={(e) => setBulletinDate(e.target.value)}
                              placeholder="7월 26일 주일"
                              className="w-full p-2.5 bg-white border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">대표 기도자 *</label>
                            <input
                              type="text"
                              required
                              value={prayer}
                              onChange={(e) => setPrayer(e.target.value)}
                              placeholder="이우진 장로"
                              className="w-full p-2.5 bg-white border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">금주의 말씀 구절 *</label>
                          <input
                            type="text"
                            required
                            value={scripture}
                            onChange={(e) => setScripture(e.target.value)}
                            placeholder="요한복음 6장 35절"
                            className="w-full p-2.5 bg-white border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none"
                          />
                        </div>



                        {/* 주보 이미지 업로드 영역 */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#2F3E46] mb-1 flex items-center justify-between">
                            <span>지면 주보 사진 업로드 {bulletinImages.length === 0 ? '*' : ''}</span>
                            <span className="text-[10px] text-[#4F6D7A] font-semibold font-mono">{bulletinImages.length}장 선택됨</span>
                          </label>
                          <div className="relative border-2 border-dashed border-[#2F3E46]/15 rounded-xl p-4 bg-white hover:border-[#4F6D7A]/50 transition-colors cursor-pointer group text-center">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              title="주보 사진 선택"
                            />
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <Upload className="text-[#4F6D7A]/60 group-hover:text-[#4F6D7A] transition-colors" size={20} />
                              <span className="text-[10px] font-medium text-[#2F3E46]/70 group-hover:text-[#2F3E46]">스마트폰으로 촬영한 주보 사진 올리기</span>
                              <span className="text-[9px] text-gray-400">클릭하거나 여러 장의 사진을 드래그해 놓으세요. (자동 압축 처리)</span>
                            </div>
                          </div>
                          
                          {imageUploading && (
                            <div className="text-[10px] text-[#4F6D7A] font-semibold flex items-center gap-1.5 mt-2">
                              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#4F6D7A] border-t-transparent"></span>
                              사진 압축 인코딩 중...
                            </div>
                          )}

                          {bulletinImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-3 bg-white p-2 rounded-xl border border-[#2F3E46]/5">
                              {bulletinImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-[3/4] border border-[#2F3E46]/10 rounded-lg overflow-hidden group/thumb shadow-sm bg-[#FAF9F6]">
                                  <img src={img} alt={`page-${idx+1}`} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => removeBulletinImage(idx)}
                                      className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                                      title="사진 삭제"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] px-1 rounded font-mono">
                                    {idx + 1}쪽
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={postLoading || imageUploading}
                          id="btn-submit-post"
                          className="w-full py-3 bg-[#4F6D7A] hover:bg-[#4F6D7A]/90 text-white font-medium text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <Send size={12} />
                          {postLoading ? '업로드 중...' : '주일 주보 등록 완료'}
                        </button>
                      </form>
                    ) : (
                      /* 교회 소식 / 교인 전용 게시글 업로드 폼 */
                      <form onSubmit={handlePostSubmit} className="space-y-4">
                        <h4 className="font-serif font-bold text-sm text-[#4F6D7A] flex items-center gap-1.5 mb-1">
                          <MessageSquare size={16} />
                          {postTab === 'members' ? '교인 전용 게시글 등록' : '교회 소식 등록'}
                        </h4>
                        <p className="text-[11px] text-[#2F3E46]/60">
                          {postTab === 'members' 
                            ? '성도 간의 친교, 기도 요청, 모임 소식 등을 작성하여 교인 전용 게시판에 노출해 보세요.'
                            : '성도들과 함께 공유해야 하는 행사 소식, 교육 소식, 주간 알림 등을 작성하여 교회 소식 알림판에 노출해 보세요.'}
                        </p>

                        <div>
                          <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">
                            {postTab === 'members' ? '게시글 제목 *' : '소식 제목 *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder={postTab === 'members' ? "교인 전용 모임 및 소통글 제목" : "오병이어 여름 성경학교 개막 소식"}
                            className="w-full p-2.5 bg-white border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">
                            {postTab === 'members' ? '게시글 내용 *' : '소식 내용 *'}
                          </label>
                          <textarea
                            required
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            placeholder={postTab === 'members' ? "성도들과 나눌 소통글 또는 기도 요청 세부 정보를 적어 주세요." : "이곳에 성도들과 나눌 교회 소식 세부 정보를 자세히 적어 주세요."}
                            rows={8}
                            className="w-full p-2.5 bg-white border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none resize-none"
                          ></textarea>
                        </div>

                        <button
                          type="submit"
                          disabled={postLoading}
                          id="btn-submit-post"
                          className="w-full py-3 bg-[#4F6D7A] hover:bg-[#4F6D7A]/90 text-white font-medium text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <Send size={12} />
                          {postLoading ? '제출 중...' : postTab === 'members' ? '교인 전용 게시글 등록 완료' : '교회 소식 등록 완료'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
          {/* ==================== 7. 말씀 · 찬양 (Media) ==================== */}
          {panel === 'media' && (
            <MediaGallery isPanel={true} />
          )}

        </div>

      {/* 이미지 라이트박스 / 원본 확대 보기 모달 */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer z-50"
            title="닫기"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-4xl max-h-[85vh] overflow-auto flex items-center justify-center rounded-lg">
            <img 
              src={activeLightboxImage} 
              alt="주보 원본 이미지" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-300 cursor-zoom-out"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <p className="text-white/60 text-xs mt-4 text-center select-none">
            빈 곳을 누르시면 주보 읽기 화면으로 돌아갑니다.
          </p>
        </div>
      )}

      </div>
    </div>
  );
}
