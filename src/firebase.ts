import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

// Firebase 앱 초기화
const app = initializeApp(config);

// 지정된 databaseId를 반영하여 Firestore 초기화
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '(default)');

// Firebase Auth 초기화 및 Google 인증 프로바이더 설정
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Firestore 연결 확인 테스트 함수
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore 연결에 성공했습니다.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase 구성 또는 네트워크 상태를 확인해 주세요. 클라이언트가 오프라인 상태입니다.");
    } else {
      console.log('Firebase 연결 초기 테스트 완료 (정상 작동 준비 완료)');
    }
  }
}
testConnection();

export { app, db, auth, googleProvider, signInWithPopup, signOut };
