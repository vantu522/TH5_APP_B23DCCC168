import {
  ref,
  push,
  set,
  update,
  onValue,
  get,
  Unsubscribe,
} from 'firebase/database';
import { database } from './firebase';
import { ChatMessage, UserProfile } from '../types';

/**
 * Tạo mã định danh duy nhất cho cuộc trò chuyện 1-1 giữa 2 người dùng.
 * Sắp xếp 2 UID theo alphabet để dù A mở chat với B hay B mở chat với A đều ra cùng 1 chatId.
 */
export const getChatId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Gửi tin nhắn mới trong phòng chat 1-1
 * - Lưu tin nhắn vào /chats/{chatId}/messages/{messageId}
 * - Tự động cập nhật bản tóm tắt cuộc trò chuyện cho cả 2 người tại /userChats (hỗ trợ màn hình Home)
 */
export const sendMessage = async (
  sender: UserProfile,
  receiver: UserProfile,
  text: string
): Promise<void> => {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  const chatId = getChatId(sender.uid, receiver.uid);
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  const newMessageRef = push(messagesRef);
  const messageId = newMessageRef.key;

  if (!messageId) return;

  const timestamp = Date.now();

  const messageData: ChatMessage = {
    id: messageId,
    senderId: sender.uid,
    receiverId: receiver.uid,
    text: trimmedText,
    createdAt: timestamp,
    read: false,
  };

  // 1. Lưu tin nhắn vào phòng chat
  await set(newMessageRef, messageData);

  // 2. Cập nhật thông tin cuộc trò chuyện cho người gửi tại /userChats/{senderUid}/{receiverUid}
  const senderChatRef = ref(database, `userChats/${sender.uid}/${receiver.uid}`);
  await set(senderChatRef, {
    chatId,
    otherUser: {
      uid: receiver.uid,
      fullName: receiver.fullName,
      email: receiver.email,
      avatarUrl: receiver.avatarUrl || '',
      status: receiver.status,
    },
    lastMessage: trimmedText,
    lastMessageTime: timestamp,
    unreadCount: 0,
  });

  // 3. Cập nhật thông tin cuộc trò chuyện cho người nhận tại /userChats/{receiverUid}/{senderUid}
  // Tăng số tin chưa đọc (unreadCount) lên cho người nhận
  const receiverChatRef = ref(database, `userChats/${receiver.uid}/${sender.uid}`);
  try {
    const snap = await get(receiverChatRef);
    let currentUnread = 0;
    if (snap.exists()) {
      currentUnread = snap.val().unreadCount || 0;
    }
    await set(receiverChatRef, {
      chatId,
      otherUser: {
        uid: sender.uid,
        fullName: sender.fullName,
        email: sender.email,
        avatarUrl: sender.avatarUrl || '',
        status: sender.status,
      },
      lastMessage: trimmedText,
      lastMessageTime: timestamp,
      unreadCount: currentUnread + 1,
    });
  } catch (err) {
    console.warn('Lỗi cập nhật userChats phía người nhận:', err);
  }
};

/**
 * Lắng nghe tin nhắn theo thời gian thực (Realtime) trong phòng chat
 * Hủy lắng nghe (off / unsubscribe) khi gọi hàm trả về để tránh lặp tin nhắn
 */
export const subscribeMessages = (
  chatId: string,
  onSuccess: (messages: ChatMessage[]) => void,
  onError?: (error: any) => void
): Unsubscribe => {
  const messagesRef = ref(database, `chats/${chatId}/messages`);

  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onSuccess([]);
        return;
      }

      const raw = snapshot.val();
      const messagesList: ChatMessage[] = [];

      Object.keys(raw).forEach((key) => {
        const item = raw[key];
        if (item && item.id) {
          messagesList.push(item);
        }
      });

      // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất ở trên, mới nhất ở dưới)
      messagesList.sort((a, b) => a.createdAt - b.createdAt);

      onSuccess(messagesList);
    },
    (err) => {
      console.warn('Lỗi lắng nghe tin nhắn:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
};

/**
 * Đánh dấu toàn bộ tin nhắn gửi đến mình trong cuộc trò chuyện là ĐÃ ĐỌC (read = true)
 * Và đặt lại unreadCount = 0 trong userChats
 */
export const markMessagesAsRead = async (
  chatId: string,
  myUid: string,
  otherUid: string
): Promise<void> => {
  try {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const snap = await get(messagesRef);

    if (snap.exists()) {
      const raw = snap.val();
      const updates: Record<string, any> = {};

      Object.keys(raw).forEach((key) => {
        const msg: ChatMessage = raw[key];
        // Nếu tin nhắn là gửi cho mình và chưa đọc -> đánh dấu đã đọc
        if (msg.receiverId === myUid && !msg.read) {
          updates[`chats/${chatId}/messages/${key}/read`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    }

    // Đặt số tin chưa đọc của cuộc trò chuyện này về 0
    const userChatRef = ref(database, `userChats/${myUid}/${otherUid}`);
    await update(userChatRef, {
      unreadCount: 0,
    });
  } catch (err) {
    console.warn('Lỗi đánh dấu đã đọc:', err);
  }
};

/**
 * Lắng nghe trạng thái online/offline của người nhận theo thời gian thực để cập nhật lên Header
 */
export const subscribeReceiverStatus = (
  receiverUid: string,
  onUpdate: (user: UserProfile) => void
): Unsubscribe => {
  const userRef = ref(database, `users/${receiverUid}`);
  return onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val());
    }
  });
};

/**
 * Lắng nghe danh sách tất cả các cuộc trò chuyện của người dùng hiện tại (cho Màn hình Home)
 * - Tự động sắp xếp: Cuộc trò chuyện có tin nhắn mới nhất nằm trên cùng (giảm dần theo lastMessageTime)
 * - Bao gồm: Avatar, Tên, Tin nhắn cuối, Thời gian, Số tin chưa đọc (unreadCount)
 */
export const subscribeUserConversations = (
  currentUid: string,
  onSuccess: (conversations: any[]) => void,
  onError?: (error: any) => void
): Unsubscribe => {
  const userChatsRef = ref(database, `userChats/${currentUid}`);

  return onValue(
    userChatsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onSuccess([]);
        return;
      }

      const raw = snapshot.val();
      const list: any[] = [];

      Object.keys(raw).forEach((otherUid) => {
        const item = raw[otherUid];
        if (item) {
          list.push({
            otherUid,
            chatId: item.chatId,
            otherUser: item.otherUser,
            lastMessage: item.lastMessage || '',
            lastMessageTime: item.lastMessageTime || 0,
            unreadCount: item.unreadCount || 0,
          });
        }
      });

      // Sắp xếp: Tin nhắn mới nhất nằm trên cùng theo yêu cầu đề bài
      list.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      onSuccess(list);
    },
    (err) => {
      console.warn('Lỗi lắng nghe danh sách cuộc trò chuyện:', err);
      if (onError) onError(err);
    }
  );
};

