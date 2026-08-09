import { WorshipService, BulletinNews, BoardPost } from './types';

// 예배 안내 데이터
export const worshipServices: WorshipService[] = [
  {
    name: "주일 대예배",
    time: "오전 11:00",
    location: "은혜홀 (본당 2층)"
  },
  {
    name: "주일 학교 (유·초등부)",
    time: "오전 11:00",
    location: "비전홀 (2층)"
  },
  {
    name: "목장 예배",
    time: "오후 01:30",
    location: "각 목장"
  },
  {
    name: "목요 찬양 예배",
    time: "오후 08:00",
    location: "은혜홀 (본당 2층)"
  },
  { 
    name: "월삭 새벽 예배 (매월 1일)",
    time:"오전 05:30",
    location: "은혜홀 (본당 2층)"
  },
  {
    name: "새벽 기도회 (화~금)",
    time: "오전 05:30",
    location: "은혜홀 (본당 2층)"
  }
];

// 미디어 아이템 데이터 (설교 및 찬양 영상 테스트 데이터)
export interface MediaItem {
  id: string;
  category: 'sermon' | 'praise';
  title: string;
  speaker: string;
  date: string;
  duration: string;
  youtubeId: string;
  thumbnailUrl: string;
  scripture?: string;
}

export const mediaItems: MediaItem[] = [];

// 교회 소식 / 금주 주보 데이터
export const bulletinNews: BulletinNews[] = [];

// 초기 오병이어 소식 & 교인 게시판 데이터
export const initialBoardPosts: BoardPost[] = [
  {
    id: 'bulletin-20260809',
    title: '2026년 8월 9일 주일 주보 (제2026-2호)',
    bulletinDate: '2026년 8월 9일 주일',
    scripture: '역대상 4장 9-10절',
    prayer: '선혜자 권사',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-09T00:00:00.000Z',
    type: 'bulletin',
    content: '2026년 8월 9일 주일 주보입니다.',
    images: [
      '/KakaoTalk_Photo_2026-08-09-19-55-49 001.jpeg',
      '/KakaoTalk_Photo_2026-08-09-19-55-49 002.jpeg'
    ]
  }
];
