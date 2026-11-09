export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  status: 'online' | 'offline';
  lastSeen?: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface ConversationItem {
  chatId: string;
  otherUser: UserProfile;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}
