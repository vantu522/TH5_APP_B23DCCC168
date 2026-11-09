import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { ref, set, update } from 'firebase/database';
import { auth, database } from './firebase';
import { UserProfile } from '../types';

export const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Địa chỉ email không đúng định dạng.';
    case 'auth/user-not-found':
      return 'Tài khoản không tồn tại trên hệ thống.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng cho một tài khoản khác.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu, phải có ít nhất 6 ký tự.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại Internet.';
    case 'auth/too-many-requests':
      return 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.';
    default:
      return error?.message || 'Đã xảy ra lỗi, vui lòng thử lại.';
  }
};

/**
 * Đăng ký tài khoản mới bằng Email & Password
 * Sau khi tạo thành công trên Auth, lưu thông tin vào nhánh /users/{uid} của Realtime Database
 */
export const registerUser = async (
  fullName: string,
  email: string,
  password: string
): Promise<User> => {
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    trimmedEmail,
    password
  );
  const user = userCredential.user;

  // Cập nhật displayName cho user trong Firebase Auth
  await updateProfile(user, {
    displayName: trimmedName,
  });

  // Lưu thông tin người dùng vào Realtime Database tại /users/{uid}
  const userRef = ref(database, `users/${user.uid}`);
  const userProfile: UserProfile = {
    uid: user.uid,
    fullName: trimmedName,
    email: trimmedEmail,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      trimmedName
    )}&background=2563EB&color=fff&size=128`,
    status: 'online',
    lastSeen: Date.now(),
    createdAt: Date.now(),
  };

  await set(userRef, userProfile);

  return user;
};

/**
 * Đăng nhập bằng Email & Password
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  const trimmedEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(
    auth,
    trimmedEmail,
    password
  );
  return userCredential.user;
};

/**
 * Đăng xuất
 * Cập nhật trạng thái offline trước khi thoát
 */
export const logoutUser = async (): Promise<void> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const userStatusRef = ref(database, `users/${currentUser.uid}`);
      await update(userStatusRef, {
        status: 'offline',
        lastSeen: Date.now(),
      });
    } catch (e) {
      console.warn('Lỗi cập nhật trạng thái khi đăng xuất:', e);
    }
  }
  await signOut(auth);
};

/**
 * Lắng nghe trạng thái đăng nhập
 */
export const subscribeAuthState = (
  callback: (user: User | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};
