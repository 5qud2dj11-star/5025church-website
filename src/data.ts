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
// 48번째 줄 } 아래에 추가하세요

export const mediaItems: MediaItem[] = [
  {
    id: "20260816-sermon",
    category: "sermon",
    title: "원주 오병이어교회 [주일예배]",
    speaker: "정일혁 목사",
    date: "2026.08.16",
    duration: "1:18:50",
    youtubeId: "oYewlV5DlhQ",
    thumbnailUrl: "https://www.youtube.com/watch?v=oyewIV5DlhQ&t=2597s",
    scripture: "창세기 40장 9-15절"
  }
];

// 교회 소식 / 금주 주보 데이터
export const bulletinNews: BulletinNews[] = [];

// 초기 오병이어 소식 & 교인 게시판 데이터
export const initialBoardPosts: BoardPost[] = [
   {
     id: 'bulletin-20260816',
    title: '2026년 8월 30일 주일 주보 (제2026-37호)',
    bulletinDate: '2026년 8월 30일 주일',
    scripture: '룻기 3장 10절',
    prayer: '정예영 청년',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-30T00:00:00.000Z',
    type: 'bulletin',
    content: '2026년 8월 30일 주일 주보입니다.',
  images: [
      '/260830-1.jpeg',
      '/260830-2.jpeg'
    ],
  },
  {
     id: 'bulletin-20260816',
    title: '2026년 8월 23일 주일 주보 (제2026-36호)',
    bulletinDate: '2026년 8월 23일 주일',
    scripture: '다니엘 1장 1-7절',
    prayer: '김혜지 집사',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-23T00:00:00.000Z',
    type: 'bulletin',
    content: '2026년 8월 23일 주일 주보입니다.',
  images: [
      '/260825-1.jpeg',
      '/260825-2.jpeg'
    ],
  },
  {
     id: 'bulletin-20260816',
    title: '2026년 8월 16일 주일 주보 (제2026-35호)',
    bulletinDate: '2026년 8월 16일 주일',
    scripture: '창세기 40장 9-15절',
    prayer: '천현미 집사',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-16T00:00:00.000Z',
    type: 'bulletin',
    content: '2026년 8월 16일 주일 주보입니다.',
  images: [
      '/2026년 8월 16일 주보 1.pdf',
      '/2026년 8월 16일 주보 2.pdf'
    ],
  },
  {   
    id: 'bulletin-20260809',
    title: '2026년 8월 9일 주일 주보 (제2026-34호)',
    bulletinDate: '2026년 8월 9일 주일',
    scripture: '역대상 4장 9-10절',
    prayer: '선혜자 권사',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-09T00:00:00.000Z',
    type: 'bulletin',
    content: '2026년 8월 9일 주일 주보입니다.',
  images: [
      '/260809-1.jpeg',
      '/260809-2.jpeg'
    ],
  },
  {
    id: 'news-20260823-1',
    title: '[안내] 다음 주 주일예배 설교 안내 (송무헌 선교사님)',
    content: '다음 주 주일예배는 캄보디아에서 사역 중이신 송무헌 선교사님께서 은혜의 말씀을 전해주십니다. 열방을 향한 하나님의 마음과 현장의 은혜를 함께 나누는 시간에 성도 여러분의 많은 관심과 기도를 부탁드립니다.',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-23T10:40:00.000Z',
    type: 'news',
  },
  {
    id: 'news-20260823-2',
    title: '[안내] 오병이어교회 공식 유튜브 채널 안내',
    content: '오병이어교회 공식 유튜브 채널이 활성화되어 있습니다. 언제 어디서나 예배와 설교 말씀을 다시 보실 수 있으니, 성도 여러분의 많은 구독과 좋아요, 알림 설정 부탁드립니다.\n\n📌 유튜브 검색: \'원주 오병이어 교회\'',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-23T10:40:00.000Z',
    type: 'news',
  },
  {
    id: 'news-20260823-3',
    title: '[안내] 9월 전교인 새신자 교육 안내 (4주 과정)',
    content: '9월 6일(주일)부터 4주간 오후 목장예배 시간에 전교인 새신자 교육이 진행됩니다. 신앙의 기초를 다지고 교회 공동체로 함께 세워지는 귀한 시간이오니, 성도 여러분의 적극적인 참여와 기도를 부탁드립니다.',
    userName: '오병이어교회',
    userId: 'admin',
    createdAt: '2026-08-23T10:40:00.000Z',
    type: 'news',
  }
];
