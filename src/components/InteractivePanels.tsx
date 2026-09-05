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

  // 현재 사용자 로그인 모니터링 및 교인 전용 게시판 잠금 해제 상태 동기화
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

  // 게시글 및 새가족 데이터 가져오기
  useEffect(() => {
    if (panel === 'board' || panel === 'bulletin') {
      fetchBoardPosts();
      if (user) {
        fetchMyPosts(user.uid);
      }
    }
  }, [panel, user]);

  // 패널 종류에 따른 기본 탭 설정
  useEffect(() => {
    if (panel === 'bulletin') {
      setPostTab('bulletin');
    } else if (panel === 'board') {
      setPostTab('news');
    }
  }, [panel]);

  // 선택한 주보의 기본 뷰 모드 설정
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
      
      setPostTitle('');
      setPostContent('');
      setBulletinDate('');
      setScripture('');
      setPrayer('');
      setBulletinImages([]);

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

  const newsPosts = posts.filter(p => (p.type === 'news' || !p.type) && p.type !== 'members' && p.type !== 'bulletin');
  const filteredNewsPosts = newsPosts.filter(p => {
    if (!newsSearchQuery.trim()) return true;
    const query = newsSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query);
  });

  const newsYears: number[] = (Array.from(new Set(newsPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))) as number[]).sort((a: number, b: number) => b - a);

  const yearlyFilteredNews = filteredNewsPosts.filter(p => {
    if (selectedNewsYear === 'All') return true;
    const year = new Date(p.createdAt).getFullYear();
    return year.toString() === selectedNewsYear;
  });

  const newsItemsPerPage = 4;
  const totalNewsPages = Math.ceil(yearlyFilteredNews.length / newsItemsPerPage) || 1;
  const currentNewsPage = Math.min(newsPage, totalNewsPages);
  const displayedNews = yearlyFilteredNews.slice((currentNewsPage - 1) * newsItemsPerPage, currentNewsPage * newsItemsPerPage);

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

  const bulletinYears: number[] = (Array.from(new Set(bulletinPosts.map(p => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) ? 2026 : d.getFullYear();
  }))) as number[]).sort((a: number, b: number) => b - a);

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
                        <div
                          className="absolute top-0 left-0 right-0 h-1 transition-opacity opacity-75 group-hover:opacity-100"
                          style={{ backgroundColor: val.color }}
                        />

                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                            <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-mono font-bold text-xs flex items-center justify-center shadow-2xs ${val.badgeColor}`}>
                              {val.num}
                            </span>
                            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${val.iconBg}`}>
                              <ValueIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </div>
                          </div>

                          <h6 className="font-serif font-bold text-[#2F3E46] text-sm sm:text-lg leading-snug break-keep [word-break:keep-all] group-hover:text-[#2EB096] transition-colors">
                            {val.title}
                          </h6>

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
                      className="p-4 rounded-2xl bg-white border border-[#2F3E46]/10 shadow-xs flex flex-col justify-between gap-3 hover:border-[#0096E6]/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-[#2F3E46] text-base block leading-snug">
                            {mainName}
                          </span>
                          {subName && (
                            <span className="text-xs text-[#2F3E46]/60 block font-normal mt-0.5">
                              {subName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0096E6]/10 text-[#0096E6] shrink-0">
                          {ws.target}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-[#2F3E46]/5 text-[#2F3E46]/80">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-[#0096E6] shrink-0" />
                          <span className="font-medium">{ws.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-[#2EB096] shrink-0" />
                          <span>{ws.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 데스크톱/태블릿 전용 테이블 뷰 (sm 이상) */}
              <div className="hidden sm:block overflow-hidden rounded-2xl border border-[#2F3E46]/10 bg-white shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b border-[#2F3E46]/10 text-xs text-[#2F3E46]/60 uppercase tracking-wider font-semibold">
                      <th className="py-4 px-6">예배명</th>
                      <th className="py-4 px-6">시간</th>
                      <th className="py-4 px-6">장소</th>
                      <th className="py-4 px-6">대상</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2F3E46]/10 text-sm text-[#2F3E46]">
                    {worshipServices.map((ws, index) => {
                      const match = ws.name.match(/^(.*?)\s*(\(.*\))$/);
                      const mainName = match ? match[1] : ws.name;
                      const subName = match ? match[2] : null;

                      return (
                        <tr key={index} className="hover:bg-[#FAF9F6]/50 transition-colors">
                          <td className="py-4 px-6 font-bold text-[#2F3E46]">
                            <span className="block">{mainName}</span>
                            {subName && (
                              <span className="text-xs text-[#2F3E46]/60 font-normal block mt-0.5">
                                {subName}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-medium text-[#0096E6]">{ws.time}</td>
                          <td className="py-4 px-6 text-[#2F3E46]/80">{ws.location}</td>
                          <td className="py-4 px-6">
                            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#2F3E46]/5 text-[#2F3E46]/80">
                              {ws.target}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 3. 미디어 (Media) ==================== */}
          {panel === 'media' && (
            <div className="animate-fade-in">
              <MediaGallery />
            </div>
          )}

      {panel === 'location' && (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative rounded-2xl overflow-hidden border border-[#2F3E46]/10 shadow-xs h-[300px] sm:h-[400px] bg-[#FAF9F6]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3159.2!2d127.876!3d37.365!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zS29yZWEsIEdhbmd3b24tZG8sIFdvbmp1LXNpLCBqaWplb25nLW1lb24sIFNoaW5qaWplb25nLXJvLDE4NA!5e0!3m2!1sko!2skr!4v1!"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="교회 위치 지도"
          />
        </div>
      </div>
    </div>
<div className="space-y-4 flex flex-col justify-between">
  <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-[#2F3E46]/10 space-y-4">
    <h4 className="font-serif font-bold text-lg text-[#2F3E46] flex items-center gap-2">
      <MapPin size={18} className="text-[#0096E6]" />
      위치 안내
    </h4>
    <div className="space-y-3 text-sm text-[#2F3E46]/80 font-light">
      <div>
        <span className="font-bold block text-[#2F3E46] text-xs uppercase tracking-wider text-[#2F3E46]/50 mb-1">도로명 주소</span>
        <p className="leading-relaxed">강원특별자치도 원주시 지정면 신지정로 184, 2층</p>
      </div>
    </div>
  </div>

  <div className="bg-white p-6 rounded-2xl border border-[#2F3E46]/10 space-y-3">
    <h4 className="font-serif font-bold text-base text-[#2F3E46] flex items-center gap-2">
      <Info size={18} className="text-[#2EB096]" />
      주차 안내
    </h4>
    <p className="text-xs text-[#2F3E46]/80 leading-relaxed font-light">
      교회 내 전용 주차장 및 주말 인근 지정 주차 구역을 무료로 이용하실 수 있습니다.
    </p>
  </div>
</div>

                  <div className="bg-white p-6 rounded-2xl border border-[#2F3E46]/10 space-y-3">
                    <h4 className="font-serif font-bold text-base text-[#2F3E46] flex items-center gap-2">
                      <Info size={18} className="text-[#2EB096]" />
                      주차 안내
                    </h4>
                    <p className="text-xs text-[#2F3E46]/80 leading-relaxed font-light">
                      교회 내 전용 주차장 및 주말 인근 지정 주차 구역을 무료로 이용하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 5. 주보 (Bulletin) ==================== */}
          {panel === 'bulletin' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in" ref={boardScrollContainerRef}>
              
              {/* 상단 탭 버튼 */}
              <div className="flex border-b border-[#2F3E46]/10 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => { setPostTab('bulletin'); setSelectedBulletin(null); }}
                  className={`py-3 px-4 sm:px-6 font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    postTab === 'bulletin'
                      ? 'border-[#0096E6] text-[#0096E6]'
                      : 'border-transparent text-[#2F3E46]/60 hover:text-[#2F3E46]'
                  }`}
                >
                  최신 및 역대 주보
                </button>

                {user && user.email === '5qud2dj11@gmail.com' && (
                  <button
                    onClick={() => setPostTab('my')}
                    className={`py-3 px-4 sm:px-6 font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      postTab === 'my'
                        ? 'border-[#0096E6] text-[#0096E6]'
                        : 'border-transparent text-[#2F3E46]/60 hover:text-[#2F3E46]'
                    }`}
                  >
                    주보 등록하기 (관리자)
                  </button>
                )}
              </div>

              {/* 주보 탭 1: 최신 및 역대 주보 */}
              {postTab === 'bulletin' && (
                <div className="space-y-6">
                  {selectedBulletin ? (
                    <div className="space-y-6 animate-fade-in">
                      <button
                        onClick={() => setSelectedBulletin(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF9F6] border border-[#2F3E46]/15 hover:bg-[#2F3E46]/5 rounded-xl text-xs sm:text-sm font-bold text-[#2F3E46] transition-all cursor-pointer"
                      >
                        <ArrowLeft size={16} />
                        목록으로 돌아가기
                      </button>

                      <div className="p-6 sm:p-8 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-xs space-y-6">
                        <div className="border-b border-[#2F3E46]/10 pb-4">
                          <span className="inline-block px-3 py-1 bg-[#0096E6]/10 text-[#0096E6] text-xs font-bold rounded-full mb-2">
                            {selectedBulletin.bulletinDate || '주일 예배 주보'}
                          </span>
                          <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#2F3E46]">
                            {selectedBulletin.title}
                          </h4>
                          {selectedBulletin.scripture && (
                            <p className="text-xs sm:text-sm text-[#2F3E46]/70 mt-1">
                              성경 말씀: <span className="font-medium text-[#2F3E46]">{selectedBulletin.scripture}</span>
                              {selectedBulletin.prayer && (
                                <span className="ml-3">대표 기도: <span className="font-medium text-[#2F3E46]">{selectedBulletin.prayer}</span></span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* 뷰 모드 스위처 */}
                        {selectedBulletin.images && selectedBulletin.images.length > 0 && (
                          <div className="flex border-b border-[#2F3E46]/10 gap-2">
                            <button
                              onClick={() => setBulletinViewMode('image')}
                              className={`pb-2 px-3 text-xs sm:text-sm font-bold border-b-2 cursor-pointer transition-colors ${
                                bulletinViewMode === 'image'
                                  ? 'border-[#0096E6] text-[#0096E6]'
                                  : 'border-transparent text-[#2F3E46]/50 hover:text-[#2F3E46]'
                              }`}
                            >
                              지면 이미지로 보기 ({selectedBulletin.images.length}장)
                            </button>
                            <button
                              onClick={() => setBulletinViewMode('text')}
                              className={`pb-2 px-3 text-xs sm:text-sm font-bold border-b-2 cursor-pointer transition-colors ${
                                bulletinViewMode === 'text'
                                  ? 'border-[#0096E6] text-[#0096E6]'
                                  : 'border-transparent text-[#2F3E46]/50 hover:text-[#2F3E46]'
                              }`}
                            >
                              텍스트로 보기
                            </button>
                          </div>
                        )}

                        {/* 이미지 뷰 */}
                        {bulletinViewMode === 'image' && selectedBulletin.images && selectedBulletin.images.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedBulletin.images.map((imgUrl, i) => (
                              <div 
                                key={i} 
                                onClick={() => setActiveLightboxImage(imgUrl)}
                                className="group relative rounded-xl overflow-hidden border border-[#2F3E46]/10 shadow-2xs bg-[#FAF9F6] cursor-pointer"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`주보 지면 ${i + 1}`}
                                  className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                  <Search size={16} />
                                  확대보기
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* 텍스트 뷰 */
                          <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-[#2F3E46]/90 bg-[#FAF9F6] p-4 sm:p-6 rounded-xl border border-[#2F3E46]/10">
                            {selectedBulletin.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* 주보 목록 */
                    <div className="space-y-6">
                      {/* 최신 주보 메인 카드 */}
                      <div className="p-6 sm:p-8 bg-gradient-to-br from-white to-[#FAF9F6] border border-[#0096E6]/20 rounded-2xl shadow-xs space-y-4 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-3 py-1 bg-[#0096E6] text-white text-xs font-bold rounded-full">
                            금주 주보
                          </span>
                          <span className="text-xs text-[#2F3E46]/60 font-mono">
                            {activeLatestBulletin.bulletinDate}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#2F3E46]">
                            {activeLatestBulletin.title}
                          </h4>
                          {activeLatestBulletin.scripture && (
                            <p className="text-xs sm:text-sm text-[#2F3E46]/70 mt-1">
                              말씀: <span className="font-medium text-[#2F3E46]">{activeLatestBulletin.scripture}</span>
                              {activeLatestBulletin.prayer && (
                                <span className="ml-3">기도: <span className="font-medium text-[#2F3E46]">{activeLatestBulletin.prayer}</span></span>
                              )}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedBulletin(activeLatestBulletin as BoardPost)}
                          className="w-full py-3 bg-[#0096E6] hover:bg-[#0085CC] active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <BookOpen size={16} />
                          주보 상세 및 지면 이미지 열람하기
                        </button>
                      </div>

                      {/* 역대 주보 검색 및 필터 */}
                      <div className="pt-6 border-t border-[#2F3E46]/10 space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <h5 className="font-serif font-bold text-lg text-[#2F3E46]">
                            역대 주보 보관함
                          </h5>

                          <div className="flex items-center gap-2">
                            {/* 연도 필터 */}
                            <select
                              value={selectedBulletinYear}
                              onChange={(e) => {
                                setSelectedBulletinYear(e.target.value);
                                setBulletinPage(1);
                              }}
                              className="px-3 py-2 bg-white border border-[#2F3E46]/15 rounded-xl text-xs font-bold text-[#2F3E46] focus:outline-none focus:border-[#0096E6]"
                            >
                              <option value="All">전체 연도</option>
                              {bulletinYears.map((yr) => (
                                <option key={yr} value={yr.toString()}>{yr}년</option>
                              ))}
                            </select>

                            {/* 검색창 */}
                            <div className="relative flex-1 sm:w-64">
                              <input
                                type="text"
                                placeholder="주보 검색 (제목, 말씀 등)"
                                value={bulletinSearchQuery}
                                onChange={(e) => {
                                  setBulletinSearchQuery(e.target.value);
                                  setBulletinPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-[#2F3E46]/15 rounded-xl text-xs text-[#2F3E46] placeholder-[#2F3E46]/40 focus:outline-none focus:border-[#0096E6]"
                              />
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2F3E46]/40" />
                            </div>
                          </div>
                        </div>

                        {/* 주보 리스트 */}
                        <div className="divide-y divide-[#2F3E46]/10 border border-[#2F3E46]/10 rounded-2xl overflow-hidden bg-white shadow-2xs">
                          {displayedBulletins.length > 0 ? (
                            displayedBulletins.map((bp) => (
                              <div
                                key={bp.id}
                                onClick={() => setSelectedBulletin(bp)}
                                className="p-4 sm:p-5 hover:bg-[#FAF9F6] transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono font-medium text-[#0096E6] bg-[#0096E6]/10 px-2 py-0.5 rounded">
                                      {bp.bulletinDate || new Date(bp.createdAt).toLocaleDateString()}
                                    </span>
                                    {bp.images && bp.images.length > 0 && (
                                      <span className="text-[11px] font-medium text-[#2EB096] bg-[#2EB096]/10 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Image size={10} />
                                        사진 {bp.images.length}장
                                      </span>
                                    )}
                                  </div>
                                  <h6 className="font-bold text-sm sm:text-base text-[#2F3E46] group-hover:text-[#0096E6] transition-colors truncate">
                                    {bp.title}
                                  </h6>
                                  {bp.scripture && (
                                    <p className="text-xs text-[#2F3E46]/60 truncate">
                                      말씀: {bp.scripture}
                                    </p>
                                  )}
                                </div>

                                <ChevronRight size={18} className="text-[#2F3E46]/30 group-hover:text-[#0096E6] group-hover:translate-x-0.5 transition-all shrink-0" />
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-xs text-[#2F3E46]/50">
                              검색 결과에 해당하는 주보가 없습니다.
                            </div>
                          )}
                        </div>

                        {/* 주보 페이지네이션 */}
                        {totalBulletinPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                              disabled={currentBulletinPage === 1}
                              onClick={() => {
                                setBulletinPage((p) => Math.max(1, p - 1));
                                scrollToBoardTop();
                              }}
                              className="p-2 border border-[#2F3E46]/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF9F6] cursor-pointer"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-mono text-[#2F3E46]/70 px-2">
                              {currentBulletinPage} / {totalBulletinPages}
                            </span>
                            <button
                              disabled={currentBulletinPage === totalBulletinPages}
                              onClick={() => {
                                setBulletinPage((p) => Math.min(totalBulletinPages, p + 1));
                                scrollToBoardTop();
                              }}
                              className="p-2 border border-[#2F3E46]/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF9F6] cursor-pointer"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 주보 탭 2: 등록하기 (관리자) */}
              {postTab === 'my' && user && user.email === '5qud2dj11@gmail.com' && (
                <form onSubmit={handlePostSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-[#2F3E46]/10 shadow-xs">
                  <h4 className="font-serif font-bold text-lg text-[#2F3E46] mb-2">
                    신규 주보 등록 (교회 관리자)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">주보 제목</label>
                      <input
                        type="text"
                        placeholder="예: 2026년 8월 첫째 주 주일 예배 주보"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">예배 일자</label>
                      <input
                        type="text"
                        placeholder="예: 2026년 8월 2일 주일"
                        value={bulletinDate}
                        onChange={(e) => setBulletinDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">본문 말씀 (선택)</label>
                      <input
                        type="text"
                        placeholder="예: 요한복음 6장 35절"
                        value={scripture}
                        onChange={(e) => setScripture(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">대표 기도자 (선택)</label>
                      <input
                        type="text"
                        placeholder="예: 이우진 장로"
                        value={prayer}
                        onChange={(e) => setPrayer(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">주보 지면 사진 첨부 (필수, 복수 선택 가능)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="text-xs text-[#2F3E46]/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0096E6]/10 file:text-[#0096E6] hover:file:bg-[#0096E6]/20 cursor-pointer"
                    />
                    {imageUploading && <p className="text-xs text-[#0096E6] mt-1 font-medium">사진 압축 및 처리 중...</p>}

                    {bulletinImages.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                        {bulletinImages.map((img, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-[#2F3E46]/10 aspect-3/4">
                            <img src={img} alt="업로드 이미지" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeBulletinImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">주보 텍스트 내용 (선택)</label>
                    <textarea
                      rows={5}
                      placeholder="주보의 광고, 예배 순서 등 추가 텍스트 내용을 입력하세요."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6] resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={postLoading || imageUploading}
                    className="w-full py-3 bg-[#0096E6] hover:bg-[#0085CC] text-white font-bold text-sm rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {postLoading ? '등록 중...' : '주보 게시하기'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ==================== 6. 소식 (Board) ==================== */}
          {panel === 'board' && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in" ref={boardScrollContainerRef}>
              
              {/* 소식 탭 버튼 */}
              <div className="flex border-b border-[#2F3E46]/10 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => { setPostTab('news'); setSelectedNews(null); }}
                  className={`py-3 px-4 sm:px-6 font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    postTab === 'news'
                      ? 'border-[#0096E6] text-[#0096E6]'
                      : 'border-transparent text-[#2F3E46]/60 hover:text-[#2F3E46]'
                  }`}
                >
                  교회 소식 및 공지
                </button>

                <button
                  onClick={() => { setPostTab('members'); setSelectedMembers(null); }}
                  className={`py-3 px-4 sm:px-6 font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    postTab === 'members'
                      ? 'border-[#0096E6] text-[#0096E6]'
                      : 'border-transparent text-[#2F3E46]/60 hover:text-[#2F3E46]'
                  }`}
                >
                  {!isMembersUnlocked && <Lock size={14} className="text-[#2F3E46]/40" />}
                  교인 전용 소식
                </button>

                {user && user.email === '5qud2dj11@gmail.com' && (
                  <button
                    onClick={() => setPostTab('my')}
                    className={`py-3 px-4 sm:px-6 font-bold text-sm sm:text-base border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      postTab === 'my'
                        ? 'border-[#0096E6] text-[#0096E6]'
                        : 'border-transparent text-[#2F3E46]/60 hover:text-[#2F3E46]'
                    }`}
                  >
                    소식 작성하기 (관리자)
                  </button>
                )}
              </div>

              {/* 소식 탭 1: 교회 소식 및 공지 */}
              {postTab === 'news' && (
                <div className="space-y-6">
                  {selectedNews ? (
                    <div className="space-y-6 animate-fade-in">
                      <button
                        onClick={() => setSelectedNews(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF9F6] border border-[#2F3E46]/15 hover:bg-[#2F3E46]/5 rounded-xl text-xs sm:text-sm font-bold text-[#2F3E46] transition-all cursor-pointer"
                      >
                        <ArrowLeft size={16} />
                        소식 목록으로 돌아가기
                      </button>

                      <div className="p-6 sm:p-8 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-xs space-y-6">
                        <div className="border-b border-[#2F3E46]/10 pb-4">
                          <span className="inline-block px-3 py-1 bg-[#0096E6]/10 text-[#0096E6] text-xs font-bold rounded-full mb-2">
                            교회 소식
                          </span>
                          <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#2F3E46]">
                            {selectedNews.title}
                          </h4>
                          <p className="text-xs text-[#2F3E46]/60 mt-1 font-mono">
                            작성일: {new Date(selectedNews.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-[#2F3E46]/90 bg-[#FAF9F6] p-4 sm:p-6 rounded-xl border border-[#2F3E46]/10">
                          {selectedNews.content}
                        </div>

                        {user && user.email === '5qud2dj11@gmail.com' && (
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => {
                                handlePostDelete(selectedNews.id);
                                setSelectedNews(null);
                              }}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={14} />
                              게시글 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 검색 및 연도 필터 */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <h5 className="font-serif font-bold text-lg text-[#2F3E46]">
                          전체 소식 목록
                        </h5>

                        <div className="flex items-center gap-2">
                          <select
                            value={selectedNewsYear}
                            onChange={(e) => {
                              setSelectedNewsYear(e.target.value);
                              setNewsPage(1);
                            }}
                            className="px-3 py-2 bg-white border border-[#2F3E46]/15 rounded-xl text-xs font-bold text-[#2F3E46] focus:outline-none focus:border-[#0096E6]"
                          >
                            <option value="All">전체 연도</option>
                            {newsYears.map((yr) => (
                              <option key={yr} value={yr.toString()}>{yr}년</option>
                            ))}
                          </select>

                          <div className="relative flex-1 sm:w-64">
                            <input
                              type="text"
                              placeholder="소식 검색"
                              value={newsSearchQuery}
                              onChange={(e) => {
                                setNewsSearchQuery(e.target.value);
                                setNewsPage(1);
                              }}
                              className="w-full pl-9 pr-3 py-2 bg-white border border-[#2F3E46]/15 rounded-xl text-xs text-[#2F3E46] placeholder-[#2F3E46]/40 focus:outline-none focus:border-[#0096E6]"
                            />
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2F3E46]/40" />
                          </div>
                        </div>
                      </div>

                      {/* 소식 카드 목록 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayedNews.length > 0 ? (
                          displayedNews.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedNews(p)}
                              className="p-5 bg-white border border-[#2F3E46]/10 hover:border-[#0096E6]/40 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-[#0096E6] bg-[#0096E6]/10 px-2.5 py-0.5 rounded-full">
                                    공지
                                  </span>
                                  <span className="text-[11px] font-mono text-[#2F3E46]/50">
                                    {new Date(p.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <h6 className="font-serif font-bold text-base text-[#2F3E46] group-hover:text-[#0096E6] transition-colors line-clamp-1">
                                  {p.title}
                                </h6>
                                <p className="text-xs text-[#2F3E46]/70 line-clamp-2 leading-relaxed font-light">
                                  {p.content}
                                </p>
                              </div>

                              <div className="pt-4 mt-2 border-t border-[#2F3E46]/5 flex items-center justify-between text-xs font-bold text-[#0096E6]">
                                <span>자세히 보기</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 p-8 text-center text-xs text-[#2F3E46]/50 bg-white rounded-2xl border border-[#2F3E46]/10">
                            등록된 교회 소식이 없습니다.
                          </div>
                        )}
                      </div>

                      {/* 페이지네이션 */}
                      {totalNewsPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            disabled={currentNewsPage === 1}
                            onClick={() => {
                              setNewsPage((p) => Math.max(1, p - 1));
                              scrollToBoardTop();
                            }}
                            className="p-2 border border-[#2F3E46]/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF9F6] cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs font-mono text-[#2F3E46]/70 px-2">
                            {currentNewsPage} / {totalNewsPages}
                          </span>
                          <button
                            disabled={currentNewsPage === totalNewsPages}
                            onClick={() => {
                              setNewsPage((p) => Math.min(totalNewsPages, p + 1));
                              scrollToBoardTop();
                            }}
                            className="p-2 border border-[#2F3E46]/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF9F6] cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 소식 탭 2: 교인 전용 소식 */}
              {postTab === 'members' && (
                <div className="space-y-6">
                  {!isMembersUnlocked ? (
                    /* 잠금 화면 */
                    <div className="max-w-md mx-auto p-8 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-xs text-center space-y-4">
                      <div className="w-12 h-12 bg-[#0096E6]/10 text-[#0096E6] rounded-full flex items-center justify-center mx-auto">
                        <Lock size={24} />
                      </div>

                      <div>
                        <h4 className="font-serif font-bold text-lg text-[#2F3E46]">
                          교인 전용 소식 인증
                        </h4>
                        <p className="text-xs text-[#2F3E46]/70 mt-1">
                          오병이어교회 성도님들을 위한 전용 공간입니다.<br />
                          교회 비밀번호를 입력해 주세요.
                        </p>
                      </div>

                      {lockoutUntil > Date.now() ? (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold">
                          비밀번호 오류 횟수 초과로 제한되었습니다.<br />
                          남은 시간: {getRemainingLockoutText(lockoutUntil)}
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (membersPasswordInput === '0801') {
                              setIsMembersUnlocked(true);
                              localStorage.setItem('isMembersUnlocked', 'true');
                              setMembersPasswordError('');
                              setFailedAttempts(0);
                              localStorage.removeItem('pw_failed_attempts');
                            } else {
                              const newAttempts = failedAttempts + 1;
                              setFailedAttempts(newAttempts);
                              localStorage.setItem('pw_failed_attempts', newAttempts.toString());

                              if (newAttempts >= 5) {
                                const lockTime = Date.now() + 30 * 60 * 1000;
                                setLockoutUntil(lockTime);
                                localStorage.setItem('pw_lockout_until', lockTime.toString());
                                setMembersPasswordError('비밀번호 5회 오류로 30분간 접근이 제한됩니다.');
                              } else {
                                setMembersPasswordError(`비밀번호가 올바르지 않습니다. (${newAttempts}/5회 실패)`);
                              }
                            }
                          }}
                          className="space-y-3"
                        >
                          <input
                            type="password"
                            placeholder="비밀번호 입력"
                            value={membersPasswordInput}
                            onChange={(e) => setMembersPasswordInput(e.target.value)}
                            className="w-full px-4 py-2.5 text-center font-mono text-sm border border-[#2F3E46]/20 rounded-xl focus:outline-none focus:border-[#0096E6]"
                            required
                          />

                          {membersPasswordError && (
                            <p className="text-xs text-red-500 font-medium">{membersPasswordError}</p>
                          )}

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-[#0096E6] hover:bg-[#0085CC] text-white font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
                          >
                            잠금 해제
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    /* 잠금 해제된 화면 */
                    <div className="space-y-6">
                      {selectedMembers ? (
                        <div className="space-y-6 animate-fade-in">
                          <button
                            onClick={() => setSelectedMembers(null)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF9F6] border border-[#2F3E46]/15 hover:bg-[#2F3E46]/5 rounded-xl text-xs sm:text-sm font-bold text-[#2F3E46] transition-all cursor-pointer"
                          >
                            <ArrowLeft size={16} />
                            교인 소식 목록으로 돌아가기
                          </button>

                          <div className="p-6 sm:p-8 bg-white border border-[#2F3E46]/10 rounded-2xl shadow-xs space-y-6">
                            <div className="border-b border-[#2F3E46]/10 pb-4">
                              <span className="inline-block px-3 py-1 bg-[#2EB096]/10 text-[#2EB096] text-xs font-bold rounded-full mb-2">
                                교인 전용
                              </span>
                              <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#2F3E46]">
                                {selectedMembers.title}
                              </h4>
                              <p className="text-xs text-[#2F3E46]/60 mt-1 font-mono">
                                작성일: {new Date(selectedMembers.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-[#2F3E46]/90 bg-[#FAF9F6] p-4 sm:p-6 rounded-xl border border-[#2F3E46]/10">
                              {selectedMembers.content}
                            </div>

                            {user && user.email === '5qud2dj11@gmail.com' && (
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => {
                                    handlePostDelete(selectedMembers.id);
                                    setSelectedMembers(null);
                                  }}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                  게시글 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <h5 className="font-serif font-bold text-lg text-[#2F3E46] flex items-center gap-2">
                              <Unlock size={18} className="text-[#2EB096]" />
                              교인 전용 소식
                            </h5>

                            <div className="flex items-center gap-2">
                              <select
                                value={selectedMembersYear}
                                onChange={(e) => {
                                  setSelectedMembersYear(e.target.value);
                                  setMembersPage(1);
                                }}
                                className="px-3 py-2 bg-white border border-[#2F3E46]/15 rounded-xl text-xs font-bold text-[#2F3E46] focus:outline-none focus:border-[#0096E6]"
                              >
                                <option value="All">전체 연도</option>
                                {membersYears.map((yr) => (
                                  <option key={yr} value={yr.toString()}>{yr}년</option>
                                ))}
                              </select>

                              <div className="relative flex-1 sm:w-64">
                                <input
                                  type="text"
                                  placeholder="교인 소식 검색"
                                  value={membersSearchQuery}
                                  onChange={(e) => {
                                    setMembersSearchQuery(e.target.value);
                                    setMembersPage(1);
                                  }}
                                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#2F3E46]/15 rounded-xl text-xs text-[#2F3E46] placeholder-[#2F3E46]/40 focus:outline-none focus:border-[#0096E6]"
                                />
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2F3E46]/40" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {displayedMembers.length > 0 ? (
                              displayedMembers.map((p) => (
                                <div
                                  key={p.id}
                                  onClick={() => setSelectedMembers(p)}
                                  className="p-5 bg-white border border-[#2F3E46]/10 hover:border-[#2EB096]/40 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-[#2EB096] bg-[#2EB096]/10 px-2.5 py-0.5 rounded-full">
                                        교인 전용
                                      </span>
                                      <span className="text-[11px] font-mono text-[#2F3E46]/50">
                                        {new Date(p.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <h6 className="font-serif font-bold text-base text-[#2F3E46] group-hover:text-[#2EB096] transition-colors line-clamp-1">
                                      {p.title}
                                    </h6>
                                    <p className="text-xs text-[#2F3E46]/70 line-clamp-2 leading-relaxed font-light">
                                      {p.content}
                                    </p>
                                  </div>

                                  <div className="pt-4 mt-2 border-t border-[#2F3E46]/5 flex items-center justify-between text-xs font-bold text-[#2EB096]">
                                    <span>자세히 보기</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 p-8 text-center text-xs text-[#2F3E46]/50 bg-white rounded-2xl border border-[#2F3E46]/10">
                                등록된 교인 전용 소식이 없습니다.
                              </div>
                            )}
                          </div>

                          {totalMembersPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-2">
                              <button
                                disabled={currentMembersPage === 1}
                                onClick={() => {
                                  setMembersPage((p) => Math.max(1, p - 1));
                                  scrollToBoardTop();
                                }}
                                className="p-2 border border-[#2F3E46]/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF9F6] cursor-pointer"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span className="text-xs font-mono text-[#2F3E46]/70 px-2">
                                {currentMembersPage} / {totalMembersPages}
                              </span>
                              <button
                                disabled={currentMembersPage === totalMembersPages}
                                onClick={() => {
                                  setMembersPage((p) => Math.min(totalMembersPages, p + 1));
                                  scrollToBoardTop();
                                }}
                                className="p-2 border border-[#2F3E46]/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF9F6] cursor-pointer"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 소식 탭 3: 소식 작성하기 (관리자) */}
              {postTab === 'my' && user && user.email === '5qud2dj11@gmail.com' && (
                <form onSubmit={handlePostSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-[#2F3E46]/10 shadow-xs">
                  <h4 className="font-serif font-bold text-lg text-[#2F3E46] mb-2">
                    신규 소식 작성 (교회 관리자)
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">소식 구분</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-[#2F3E46] cursor-pointer">
                        <input
                          type="radio"
                          name="newsType"
                          checked={postTab !== 'members'}
                          onChange={() => setPostTab('news')}
                          className="accent-[#0096E6]"
                        />
                        일반 교회 소식
                      </label>
                      <label className="flex items-center gap-2 text-xs text-[#2F3E46] cursor-pointer">
                        <input
                          type="radio"
                          name="newsType"
                          checked={postTab === 'members'}
                          onChange={() => setPostTab('members')}
                          className="accent-[#0096E6]"
                        />
                        교인 전용 소식
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">제목</label>
                    <input
                      type="text"
                      placeholder="소식 제목을 입력하세요."
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2F3E46]/70 mb-1">내용</label>
                    <textarea
                      rows={6}
                      placeholder="상세 내용을 입력하세요."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm border border-[#2F3E46]/15 rounded-xl focus:outline-none focus:border-[#0096E6] resize-y"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={postLoading}
                    className="w-full py-3 bg-[#0096E6] hover:bg-[#0085CC] text-white font-bold text-sm rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    {postLoading ? '등록 중...' : '소식 게시하기'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 주보 라이트박스 (사진 확대 보기) */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto rounded-xl">
            <img
              src={activeLightboxImage}
              alt="주보 지면 확대"
              className="w-full h-auto object-contain"
            />
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
