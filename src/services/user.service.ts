import {
  ref,
  onValue,
  onDisconnect,
  serverTimestamp,
  update,
  Unsubscribe,
} from 'firebase/database';
import { database } from './firebase';
import { UserProfile } from '../types';

/**
 * Thiết lập hệ thống hiện diện (Presence) Realtime:
 * - Khi có kết nối mạng: Cập nhật status = 'online'
 * - Khi mất kết nối hoặc thoát app: Firebase tự động kích hoạt onDisconnect chuyển status = 'offline'
 */
export const setupPresence = (uid: string): (() => void) => {
  if (!uid) return () => {};

  const connectedRef = ref(database, '.info/connected');
  const userStatusRef = ref(database, `users/${uid}`);

  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      // 1. Đặt hành vi khi ngắt kết nối (thoát app, mất mạng, crash)
      onDisconnect(userStatusRef)
        .update({
          status: 'offline',
          lastSeen: serverTimestamp(),
        })
        .catch((err) => console.warn('Lỗi onDisconnect setup:', err));

      // 2. Cập nhật trạng thái hiện tại là online
      update(userStatusRef, {
        status: 'online',
        lastSeen: serverTimestamp(),
      }).catch((err) => console.warn('Lỗi cập nhật online:', err));
    }
  });

  return () => {
    // Khi component unmount hoặc logout
    unsubscribe();
  };
};

/**
 * Lắng nghe danh sách người dùng đã đăng ký theo thời gian thực (Realtime)
 * - Tự động loại trừ người dùng hiện tại (không gồm bản thân)
 * - Tự động cập nhật trạng thái online/offline tức thì
 * - Sắp xếp: Những người online lên trước, sau đó theo bảng chữ cái
 */
export const subscribeUsersList = (
  currentUid: string,
  onSuccess: (users: UserProfile[]) => void,
  onError?: (error: any) => void
): Unsubscribe => {
  const usersRef = ref(database, 'users');

  const unsubscribe = onValue(
    usersRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onSuccess([]);
        return;
      }

      const rawData = snapshot.val();
      const usersList: UserProfile[] = [];

      Object.keys(rawData).forEach((key) => {
        const item = rawData[key];
        // Loại bỏ chính bản thân theo yêu cầu đề bài
        if (item && item.uid && item.uid !== currentUid) {
          usersList.push({
            uid: item.uid,
            fullName: item.fullName || 'Người dùng',
            email: item.email || '',
            avatarUrl:
              item.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                item.fullName || 'User'
              )}&background=2563EB&color=fff&size=128`,
            status: item.status === 'online' ? 'online' : 'offline',
            lastSeen: item.lastSeen || item.createdAt || 0,
            createdAt: item.createdAt || 0,
          });
        }
      });

      // Sắp xếp: online lên trước, sau đó theo tên
      usersList.sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.fullName.localeCompare(b.fullName, 'vi');
      });

      onSuccess(usersList);
    },
    (error) => {
      console.warn('Lỗi lắng nghe danh sách người dùng:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
};

/**
 * Cập nhật trạng thái thủ công (ví dụ khi app vào background/foreground)
 */
export const setUserOnlineStatus = async (
  uid: string,
  status: 'online' | 'offline'
): Promise<void> => {
  if (!uid) return;
  try {
    const userRef = ref(database, `users/${uid}`);
    await update(userRef, {
      status,
      lastSeen: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Lỗi cập nhật trạng thái:', err);
  }
};
