import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { mediaItems as staticMediaItems, MediaItem } from '../data';
import { 
  Play, 
  Calendar, 
  User as UserIcon, 
  BookOpen, 
  X, 
  ExternalLink, 
  Search, 
  ChevronLeft, 
  Plus, 
  Sparkles, 
  Video, 
  Film,
  Music,
  Info,
  ArrowRight
} from 'lucide-react';

interface MediaGalleryProps {
  onNavClick?: () => void;
  isPanel?: boolean;
}

// 날짜 파싱 도우미 (다양한 날짜 수식 대응)
const parseDateStr = (dateStr: string): number => {
  if (!dateStr) return 0;
  
  // 1) "YYYY년 MM월 DD일"
  const matchKr = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (matchKr) {
    return new Date(parseInt(matchKr[1]), parseInt(matchKr[2]) - 1, parseInt(matchKr[3])).getTime();
  }
  
  // 2) Standard Date string / ISO
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;

  return 0;
};

// 개별 비디오 카드 컴포넌트 (외부 분리)
const VideoCard = ({ item, onSelect }: { item: MediaItem; onSelect: (item: MediaItem) => void }) => (
  <div
    id={`media-card-${item.id}`}
    onClick={() => onSelect(item)}
    className="bg-white border border-[#2F3E46]/10 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transform hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer group flex flex-col justify-between"
  >
    {/* 썸네일 영역 */}
    <div className={`relative aspect-video w-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
      item.category === 'sermon'
        ? 'bg-gradient-to-br from-[#38B2AC]/20 via-[#38B2AC]/10 to-[#F0FDF4]'
        : 'bg-gradient-to-br from-[#4FD1C5]/20 via-[#4FD1C5]/10 to-[#F0FDF4]'
    }`}>
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/30 blur-xl"></div>
      <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-[#38B2AC]/5 blur-2xl"></div>

      {/* 재생 버튼 */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 text-[#38B2AC] shadow-xs flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 border border-[#BBF7D0]">
          <Play size={16} className="ml-0.5 sm:ml-1 fill-[#38B2AC] text-[#38B2AC]" />
        </div>
      </div>

      {/* 영상 재생 시간 */}
      <span className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 text-[10px] sm:text-xs text-white bg-[#234E52]/85 font-mono font-medium px-2 py-0.5 rounded z-10">
        {item.duration}
      </span>

      {/* 카테고리 태그 */}
      <span className={`absolute top-2 left-2 sm:top-2.5 sm:left-2.5 text-[10px] sm:text-xs text-white font-semibold px-2 sm:px-2.5 py-0.5 rounded-lg ${
        item.category === 'sermon' ? 'bg-[#38B2AC]' : 'bg-[#319795]'
      }`}>
        {item.category === 'sermon' ? '주일 설교' : '찬양 찬송'}
      </span>
    </div>

    {/* 정보 영역 */}
    <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#234E52]/60 mb-1">
          <Calendar size={12} />
          <span>{item.date}</span>
        </div>
        <h4 className="font-serif font-bold text-sm sm:text-lg text-[#234E52] leading-snug group-hover:text-[#38B2AC] transition-colors line-clamp-2">
          {item.title}
        </h4>
        {item.scripture && (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-[#234E52] font-serif mt-1.5 sm:mt-2 bg-[#DCFCE7] px-2 py-0.5 rounded-md w-fit break-all">
            <BookOpen size={11} className="shrink-0" />
            <span className="line-clamp-1">{item.scripture}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-[#BBF7D0]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#DCFCE7] text-[#38B2AC] flex items-center justify-center shrink-0">
            <UserIcon size={12} />
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-[#234E52] truncate max-w-[110px] sm:max-w-none">
            {item.speaker}
          </span>
        </div>
        <span className="text-[10px] sm:text-xs text-[#38B2AC] font-semibold flex items-center gap-0.5 group-hover:underline shrink-0">
          영상 보기
          <ExternalLink size={10} />
        </span>
      </div>
    </div>
  </div>
);

export default function MediaGallery({ onNavClick, isPanel = false }: MediaGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);
  const [dbVideos, setDbVideos] = useState<MediaItem[]>([]);
  const [allVideos, setAllVideos] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [showStorage, setShowStorage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sermon' | 'praise'>('all');
  const [mediaPage, setMediaPage] = useState<number>(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newCategory, setNewCategory] = useState<'sermon' | 'praise'>('sermon');
  const [newTitle, setNewTitle] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newYoutubeId, setNewYoutubeId] = useState('');
  const [newScripture, setNewScripture] = useState('');

  const scrollToMediaTop = () => {
    const element = document.getElementById('interactive-panel');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return () => unsubscribe();
  }, []);

  const fetchDbVideos = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'media_items'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched: MediaItem[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as MediaItem);
      });
      setDbVideos(fetched);
    } catch (e) {
      console.error("Firestore 예배 영상 조회 실패:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDbVideos();
  }, [fetchDbVideos]);

  useEffect(() => {
    const combined = [...dbVideos];
    
    staticMediaItems.forEach((staticItem) => {
      if (!combined.some(item => item.youtubeId === staticItem.youtubeId || item.id === staticItem.id)) {
        combined.push(staticItem);
      }
    });

    combined.sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));
    setAllVideos(combined);
  }, [dbVideos]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.email !== '5qud2dj11@gmail.com') {
      alert('죄송합니다. 동영상 등록 권한이 없습니다. (교회 관리자 계정 전용)');
      return;
    }
    if (!newTitle.trim() || !newYoutubeId.trim() || !newDate.trim() || !newDuration.trim()) {
      alert('필수 항목을 모두 입력해 주세요.');
      return;
    }

    setAddLoading(true);
    try {
      const autoThumb = `https://img.youtube.com/vi/${newYoutubeId.trim()}/mqdefault.jpg`;
      const docData = {
        category: newCategory,
        title: newTitle.trim(),
        speaker: newSpeaker.trim() || (newCategory === 'sermon' ? '정일혁 담임목사' : '할렐루야 찬양대'),
        date: newDate.trim(),
        duration: newDuration.trim(),
        youtubeId: newYoutubeId.trim(),
        thumbnailUrl: autoThumb,
        scripture: newCategory === 'sermon' ? newScripture.trim() : '',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'media_items'), docData);
      alert('주일 예배 영상이 영상 저장소에 정상 등록되었습니다.');

      setNewTitle('');
      setNewSpeaker('');
      setNewDate('');
      setNewDuration('');
      setNewYoutubeId('');
      setNewScripture('');
      setShowAddModal(false);

      await fetchDbVideos();
    } catch (error) {
      console.error("영상 업로드 실패:", error);
      alert('영상 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredVideos = allVideos.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const cleanQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = !cleanQuery || 
      item.title.toLowerCase().includes(cleanQuery) ||
      item.speaker.toLowerCase().includes(cleanQuery) ||
      (item.scripture && item.scripture.toLowerCase().includes(cleanQuery));
    return matchesCategory && matchesSearch;
  });

  const mediaItemsPerPage = 9;
  const totalMediaPages = Math.ceil(filteredVideos.length / mediaItemsPerPage) || 1;
  const currentMediaPage = Math.min(mediaPage, totalMediaPages);
  const displayedVideos = filteredVideos.slice((currentMediaPage - 1) * mediaItemsPerPage, currentMediaPage * mediaItemsPerPage);

  const latestThreeVideos = allVideos.slice(0, 3);

  const renderMainFeed = () => (
    <div className="space-y-4 sm:space-y-8 animate-fade-in">
      <div className="hidden sm:flex bg-gradient-to-r from-[#F0FDF4] via-[#DCFCE7]/70 to-[#F0FDF4] border border-[#38B2AC]/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl items-center gap-2.5 text-xs sm:text-sm text-[#234E52]">
        <div className="p-1.5 bg-[#38B2AC]/15 text-[#38B2AC] rounded-lg shrink-0">
          <Sparkles size={14} className="sm:w-4 sm:h-4" />
        </div>
        <span className="leading-relaxed text-[11px] sm:text-xs md:text-sm">
          오병이어 말씀 · 찬양 메뉴에서는 <strong>가장 최근 게시된 3개의 영상</strong>을 최신순으로 빠르게 감상할 수 있습니다.
        </span>
      </div>

      {latestThreeVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6 md:gap-8">
          {latestThreeVideos.map((item) => (
            <VideoCard key={item.id} item={item} onSelect={setSelectedVideo} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 sm:py-16 px-4 text-xs sm:text-sm text-[#234E52]/70 bg-white border border-[#2F3E46]/10 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-2xs">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#38B2AC]/10 text-[#38B2AC] flex items-center justify-center shrink-0">
            <Film size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-[#2F3E46] text-xs sm:text-sm">등록된 영상이 없습니다</p>
            <p className="text-[11px] sm:text-xs text-[#2F3E46]/50">새로운 설교 및 찬양 영상이 업데이트될 예정입니다.</p>
          </div>
        </div>
      )}

      <div 
        id="btn-go-to-storage"
        onClick={() => {
          setShowStorage(true);
          setMediaPage(1);
          scrollToMediaTop();
        }}
        className="group relative bg-gradient-to-br from-[#38B2AC] via-[#319795] to-[#2C7A7B] text-white p-4 sm:p-7 md:p-9 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transform transition-all duration-300 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-6"
      >
        <div className="absolute -right-10 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-3xl group-hover:bg-white/15 transition-colors pointer-events-none"></div>
        <div className="absolute left-1/3 -top-20 w-60 h-60 rounded-full bg-[#F0FDF4]/10 blur-2xl pointer-events-none"></div>

        <div className="space-y-1 sm:space-y-2 relative z-10 max-w-2xl break-keep">
          <div className="flex items-center gap-1.5 text-[#F0FDF4]/90 font-semibold text-[11px] sm:text-xs">
            <Film size={13} className="sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>오병이어 공식 미디어 센터</span>
          </div>
          <h4 className="font-serif font-bold text-base sm:text-2xl md:text-3xl tracking-tight leading-snug text-white">
            오병이어 영상 저장소 더보기
          </h4>
          <p className="text-xs sm:text-sm text-[#F0FDF4]/90 font-light leading-relaxed break-keep">
            주일 대예배 설교, 목요 찬양 예배, 찬양 영상 등 전체 예배 미디어 자료를 감상하세요.
          </p>
        </div>

        <div className="relative z-10 bg-white text-[#234E52] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 rounded-full shadow-xs group-hover:bg-[#F0FDF4] transition-colors flex items-center justify-center gap-1.5 w-full md:w-auto shrink-0 mt-0.5 md:mt-0">
          <span>영상 저장소 입장하기</span>
          <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform shrink-0" />
        </div>
      </div>
    </div>
  );

  const renderStorageFeed = () => (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#BBF7D0] pb-4 sm:pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#DCFCE7] text-[#38B2AC] flex items-center justify-center shrink-0">
            <Film size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h5 className="font-serif font-bold text-sm sm:text-base text-[#234E52]">오병이어 영상 저장소</h5>
            <p className="text-[11px] sm:text-xs text-[#234E52]/70">예배 및 찬양 영상 모음 (전체 {filteredVideos.length}개)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {currentUser && currentUser.email === '5qud2dj11@gmail.com' && (
            <button
              id="btn-open-add-video-modal"
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-[#F0FDF4] border border-[#BBF7D0] hover:border-[#38B2AC]/30 hover:bg-white text-[#234E52] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} className="text-[#38B2AC]" />
              <span>새 영상 등록</span>
            </button>
          )}

          <button
            id="btn-back-to-media-main"
            onClick={() => {
              setShowStorage(false);
              scrollToMediaTop();
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-[#38B2AC] text-white hover:bg-[#319795] hover:shadow-md font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition-all shadow-xs border border-[#38B2AC] cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>메인으로 돌아가기</span>
          </button>
        </div>
      </div>

      <div className="bg-[#FAF9F6] border border-[#2F3E46]/10 p-2.5 sm:p-5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-1.5 w-full md:w-auto overflow-x-auto pb-0.5 md:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setMediaPage(1);
            }}
            className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#4F6D7A] text-white shadow-xs'
                : 'bg-white border border-[#2F3E46]/10 text-[#2F3E46]/70 hover:bg-[#4F6D7A]/5'
            }`}
          >
            전체 ({allVideos.length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory('sermon');
              setMediaPage(1);
            }}
            className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'sermon'
                ? 'bg-[#4F6D7A] text-white shadow-xs'
                : 'bg-white border border-[#2F3E46]/10 text-[#2F3E46]/70 hover:bg-[#4F6D7A]/5'
            }`}
          >
            주일 설교 ({allVideos.filter(v => v.category === 'sermon').length})
          </button>
          <button
            onClick={() => {
              setSelectedCategory('praise');
              setMediaPage(1);
            }}
            className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'praise'
                ? 'bg-[#66C82B] text-white shadow-xs'
                : 'bg-white border border-[#2F3E46]/10 text-[#2F3E46]/70 hover:bg-[#66C82B]/5'
            }`}
          >
            찬양 찬송 ({allVideos.filter(v => v.category === 'praise').length})
          </button>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#2F3E46]/45" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setMediaPage(1);
            }}
            placeholder="제목, 설교자, 본문 구절 검색..."
            className="w-full pl-8.5 pr-8 py-2 bg-white border border-[#2F3E46]/10 rounded-xl text-xs sm:text-sm focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/40"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setMediaPage(1);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#2F3E46]/40 hover:text-[#2F3E46]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {displayedVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {displayedVideos.map((item) => (
            <VideoCard key={item.id} item={item} onSelect={setSelectedVideo} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 sm:py-24 text-xs sm:text-sm text-[#2F3E46]/50 bg-white border border-[#2F3E46]/5 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-2.5 p-6">
          <Info size={24} className="text-[#2F3E46]/30" />
          <span>선택하신 조건 또는 검색어와 일치하는 영상이 없습니다.</span>
        </div>
      )}

      {totalMediaPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-4 sm:pt-6">
          {Array.from({ length: totalMediaPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              type="button"
              key={pageNum}
              id={`btn-media-page-${pageNum}`}
              onClick={(e) => {
                e.preventDefault();
                setMediaPage(pageNum);
                scrollToMediaTop();
              }}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all border ${
                currentMediaPage === pageNum
                  ? 'bg-[#4F6D7A] text-white border-[#4F6D7A] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#2F3E46]/70 border-[#2F3E46]/10 hover:border-[#4F6D7A]/30 hover:bg-white'
              }`}
            >
              [{pageNum}]
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {showStorage ? renderStorageFeed() : renderMainFeed()}

      {/* 영상 모달 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative border border-[#2F3E46]/10">
            <div className="flex items-center justify-between p-3.5 sm:p-5 bg-[#FAF9F6] border-b border-[#2F3E46]/10 shrink-0">
              <div className="pr-2">
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#4F6D7A] font-semibold block">
                  {selectedVideo.category === 'sermon' ? 'Sunday Sermon Series' : 'Hallelujah Choir Praise'}
                </span>
                <h4 className="font-serif font-bold text-base sm:text-xl text-[#2F3E46] leading-snug line-clamp-1">
                  {selectedVideo.title}
                </h4>
              </div>
              <button
                id="btn-close-video"
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 sm:p-2 text-[#2F3E46]/60 hover:text-[#2F3E46] hover:bg-[#2F3E46]/5 rounded-full transition-colors shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-slate-950 relative shrink-0">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>

            <div className="p-4 sm:p-6 bg-[#FAF9F6] border-t border-[#2F3E46]/10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-start sm:items-center overflow-y-auto">
              <div className="space-y-1 text-xs sm:text-sm text-[#2F3E46]/70">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="font-bold text-[#4F6D7A]">{selectedVideo.speaker}</span>
                  <span>•</span>
                  <span>{selectedVideo.date}</span>
                  <span>•</span>
                  <span>분량: {selectedVideo.duration}</span>
                </div>
                {selectedVideo.scripture && (
                  <p className="font-serif text-[#2F3E46]/75">
                    본문 말씀: {selectedVideo.scripture}
                  </p>
                )}
              </div>
              <button
                id="btn-confirm-video-done"
                onClick={() => setSelectedVideo(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#4F6D7A] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-[#4F6D7A]/90 transition-all shadow-sm shrink-0"
              >
                동영상 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl relative border border-[#2F3E46]/10">
            <div className="p-4 sm:p-6 bg-[#FAF9F6] border-b border-[#2F3E46]/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#4F6D7A]/10 text-[#4F6D7A] rounded-xl">
                  <Video size={18} />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm sm:text-base text-[#2F3E46]">예배 영상 등록</h4>
                  <p className="text-[10px] text-[#2F3E46]/50">오병이어 영상 저장소에 새로운 미디어 추가</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-[#2F3E46]/60 hover:text-[#2F3E46] hover:bg-[#2F3E46]/5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-[#2F3E46] mb-1.5">콘텐츠 카테고리 *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCategory('sermon')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      newCategory === 'sermon'
                        ? 'bg-[#4F6D7A]/10 border-[#4F6D7A] text-[#4F6D7A]'
                        : 'bg-white border-[#2F3E46]/10 text-[#2F3E46]/70 hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <Film size={14} />
                    주일 설교
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory('praise')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      newCategory === 'praise'
                        ? 'bg-[#66C82B]/10 border-[#66C82B] text-[#55AD20]'
                        : 'bg-white border-[#2F3E46]/10 text-[#2F3E46]/70 hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <Music size={14} />
                    찬양 찬송
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">동영상 제목 *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={newCategory === 'sermon' ? "생명의 만나: 오병이어의 온전한 신뢰" : "할렐루야 찬양대: 은혜로만 들어가네"}
                  className="w-full p-2.5 bg-[#FAF9F6]/50 border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/35"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">발표자 / 찬양팀</label>
                  <input
                    type="text"
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value)}
                    placeholder={newCategory === 'sermon' ? "정일혁 담임목사" : "할렐루야 찬양대"}
                    className="w-full p-2.5 bg-[#FAF9F6]/50 border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/35"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">재생 시간 (Duration) *</label>
                  <input
                    type="text"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    placeholder="예: 42:15, 06:40"
                    className="w-full p-2.5 bg-[#FAF9F6]/50 border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/35"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">등록 날짜 *</label>
                  <input
                    type="text"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="예: 2026년 7월 26일 주일설교"
                    className="w-full p-2.5 bg-[#FAF9F6]/50 border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/35"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">유튜브 ID (Video ID) *</label>
                  <input
                    type="text"
                    required
                    value={newYoutubeId}
                    onChange={(e) => setNewYoutubeId(e.target.value)}
                    placeholder="예: vG1G8H98mS8"
                    className="w-full p-2.5 bg-[#FAF9F6]/50 border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/35"
                  />
                </div>
              </div>

              {newCategory === 'sermon' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#2F3E46] mb-1">본문 말씀 구절 (선택)</label>
                  <input
                    type="text"
                    value={newScripture}
                    onChange={(e) => setNewScripture(e.target.value)}
                    placeholder="예: 요한복음 6장 35절 - 40절"
                    className="w-full p-2.5 bg-[#FAF9F6]/50 border border-[#2F3E46]/10 rounded-xl text-xs focus:ring-1 focus:ring-[#4F6D7A] focus:outline-none placeholder:text-[#2F3E46]/35"
                  />
                </div>
              )}

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white border border-[#2F3E46]/15 text-[#2F3E46] text-xs font-semibold rounded-xl hover:bg-[#FAF9F6] transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 bg-[#4F6D7A] hover:bg-[#4F6D7A]/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>{addLoading ? '등록 처리 중...' : '영상 등록 완료'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
