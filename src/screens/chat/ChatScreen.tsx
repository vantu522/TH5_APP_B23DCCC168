import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft, Send, MapPin } from 'lucide-react-native';
import { auth, database } from '../../services/firebase';
import {
  getChatId,
  sendMessage,
  subscribeMessages,
  subscribeReceiverStatus,
  markMessagesAsRead,
} from '../../services/chat.service';
import { getCurrentLocation } from '../../services/location.service';
import { ref, get } from 'firebase/database';
import { ChatMessage, UserProfile } from '../../types';
import { formatMessageTime, formatLastSeen } from '../../utils/time';
import colors from '../../theme/colors';

export default function ChatScreen({ route, navigation }: any) {
  const initialReceiver: UserProfile = route.params?.receiver;

  const [receiver, setReceiver] = useState<UserProfile>(initialReceiver);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [sendingLocation, setSendingLocation] = useState<boolean>(false);
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const currentUid = auth.currentUser?.uid;

  // 1. Tải hồ sơ người gửi (bản thân)
  useEffect(() => {
    if (!currentUid) return;

    const fetchSender = async () => {
      try {
        const snap = await get(ref(database, `users/${currentUid}`));
        if (snap.exists()) {
          setSenderProfile(snap.val());
        } else {
          setSenderProfile({
            uid: currentUid,
            fullName: auth.currentUser?.displayName || 'Người dùng',
            email: auth.currentUser?.email || '',
            status: 'online',
            createdAt: Date.now(),
          });
        }
      } catch (e) {
        console.warn('Lỗi tải thông tin người gửi:', e);
      }
    };

    fetchSender();
  }, [currentUid]);

  // 2. Lắng nghe tin nhắn & trạng thái người nhận thời gian thực
  useEffect(() => {
    if (!currentUid || !receiver?.uid) {
      setLoading(false);
      return;
    }

    const chatId = getChatId(currentUid, receiver.uid);

    // Đánh dấu toàn bộ tin nhắn gửi cho mình là ĐÃ ĐỌC
    markMessagesAsRead(chatId, currentUid, receiver.uid);

    // Lắng nghe tin nhắn realtime trong phòng chat
    const unsubscribeMessages = subscribeMessages(chatId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);

      // Khi có tin nhắn mới gửi đến trong lúc đang mở màn hình chat, đánh dấu đã đọc tiếp
      markMessagesAsRead(chatId, currentUid, receiver.uid);
    });

    // Lắng nghe trạng thái online/offline của đối phương theo thời gian thực cho thanh tiêu đề
    const unsubscribeReceiver = subscribeReceiverStatus(
      receiver.uid,
      (updatedReceiver) => {
        setReceiver(updatedReceiver);
      }
    );

    // BẮT BUỘC: Hủy lắng nghe trong cleanup của useEffect theo đúng yêu cầu đề bài
    return () => {
      unsubscribeMessages();
      unsubscribeReceiver();
    };
  }, [currentUid, receiver?.uid]);

  const getEffectiveSender = (): UserProfile => {
    if (senderProfile) return senderProfile;
    const user = auth.currentUser;
    return {
      uid: user?.uid || currentUid || 'sender',
      fullName: user?.displayName || 'Tôi',
      email: user?.email || '',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.displayName || 'User'
      )}&background=2563EB&color=fff&size=96`,
      status: 'online',
      createdAt: Date.now(),
    };
  };

  // Xử lý gửi vị trí hiện tại
  const handleSendLocation = async () => {
    if (!receiver || sendingLocation) return;
    setSendingLocation(true);
    try {
      const coords = await getCurrentLocation();
      const locationText = ` Vị trí của tôi: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      const sender = getEffectiveSender();
      await sendMessage(sender, receiver, locationText);
    } catch (err: any) {
      console.warn('Lỗi chia sẻ vị trí:', err);
    } finally {
      setSendingLocation(false);
    }
  };

  // Xử lý gửi tin nhắn
  const handleSend = async () => {
    const textToSend = inputText.trim();
    // Yêu cầu: Không cho gửi tin rỗng!
    if (!textToSend || !receiver || sending) return;

    setInputText('');
    setSending(true);

    try {
      const sender = getEffectiveSender();
      await sendMessage(sender, receiver, textToSend);
    } catch (error) {
      console.warn('Lỗi gửi tin nhắn:', error);
    } finally {
      setSending(false);
    }
  };

  const isOnline = receiver?.status === 'online';

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.senderId === currentUid;

    return (
      <View
        style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>

          <Text
            style={[
              styles.timeText,
              isMyMessage ? styles.myTimeText : styles.otherTimeText,
            ]}
          >
            {formatMessageTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Thanh tiêu đề hiển thị tên và trạng thái online theo thời gian thực */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerAvatarContainer}>
            <Image
              source={{
                uri:
                  receiver?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    receiver?.fullName || 'User'
                  )}&background=2563EB&color=fff&size=80`,
              }}
              style={styles.headerAvatar}
            />
            <View
              style={[
                styles.headerStatusDot,
                isOnline ? styles.dotOnline : styles.dotOffline,
              ]}
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {receiver?.fullName || 'Người dùng'}
            </Text>
            <Text
              style={[
                styles.headerStatusText,
                isOnline ? styles.onlineText : styles.offlineText,
              ]}
            >
              {isOnline ? 'Đang hoạt động' : formatLastSeen(receiver?.lastSeen)}
            </Text>
          </View>
        </View>

        {/* Danh sách tin nhắn */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            // Tự động cuộn xuống tin nhắn mới nhất
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
                <Text style={styles.emptySubtext}>
                  Hãy gửi lời chào đến {receiver?.fullName}!
                </Text>
              </View>
            }
          />
        )}

        {/* Thanh nhập tin nhắn */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleSendLocation}
            disabled={sendingLocation}
          >
            {sendingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MapPin size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dotOnline: {
    backgroundColor: colors.online,
  },
  dotOffline: {
    backgroundColor: colors.offline,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  onlineText: {
    color: colors.online,
  },
  offlineText: {
    color: colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: colors.text,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherTimeText: {
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1', // Slate 300
    opacity: 0.7,
  },
});
