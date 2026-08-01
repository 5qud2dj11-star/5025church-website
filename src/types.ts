export interface BoardPost {
  id?: string;
  title: string;
  content: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: string;
  type?: 'news' | 'bulletin' | 'members';
  bulletinDate?: string;
  scripture?: string;
  prayer?: string;
  images?: string[];
}

export interface Registration {
  id?: string;
  userId: string;
  name: string;
  phone: string;
  birthDate: string;
  address: string;
  motive: string;
  createdAt: string;
  status: 'submitted' | 'reviewed' | 'completed';
}

export interface Inquiry {
  id?: string;
  userId: string;
  title: string;
  content: string;
  phone?: string;
  createdAt: string;
  status: 'pending' | 'answered';
  answer?: string;
}

export interface WorshipService {
  name: string;
  time: string;
  location: string;
}

export interface BulletinNews {
  id: string;
  title: string;
  date: string;
  content: string;
}
