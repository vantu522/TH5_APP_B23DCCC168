import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MessageCircle, Search, X, Plus } from 'lucide-react-native';
import { auth } from '../../services/firebase';
import { subscribeUserConversations } from '../../services/chat.service';
import { UserProfile } from '../../types';
import { ROUTES } from '../../navigation/routes';
import { formatConversationTime } from '../../utils/time';
import colors from '../../theme/colors';

interface ConversationData {
  otherUid: string;
  chatId: string;
  otherUser: UserProfile;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export default function HomeScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setLoading(false);
      return;
    }

    // Lắng nghe danh sách cuộc trò chuyện theo thời gian thực
    const unsubscribe = subscribeUserConversations(
      currentUid,
      (data) => {
        setConversations(data);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn('Lỗi tải cuộc trò chuyện:', err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    // Hủy lắng nghe trong cleanup của useEffect để tránh lặp lại
    return () => {
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Lọc tìm kiếm theo tên người chat hoặc nội dung tin nhắn cuối
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter(
      (c) =>
        c.otherUser?.fullName?.toLowerCase().includes(query) ||
        c.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const handleOpenChat = (item: ConversationData) => {
    navigation.navigate(ROUTES.CHAT, { receiver: item.otherUser });
  };

  const renderConversationItem = ({ item }: { item: ConversationData }) => {
    const hasUnread = item.unreadCount > 0;
    const isOnline = item.otherUser?.status === 'online';

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          hasUnread && styles.conversationCardUnread,
        ]}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar kèm chấm Online */}
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.otherUser?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  item.otherUser?.fullName || 'User'
                )}&background=2563EB&color=fff&size=96`,
            }}
            style={styles.avatar}
          />
          <View
            style={[
              styles.statusDot,
              isOnline ? styles.dotOnline : styles.dotOffline,
            ]}
          />
        </View>

        {/* Thông tin cuộc trò chuyện */}
        <View style={styles.contentContainer}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.userName,
                hasUnread && styles.userNameBold,
              ]}
              numberOfLines={1}
            >
              {item.otherUser?.fullName || 'Người dùng'}
            </Text>
            <Text
              style={[
                styles.timeText,
                hasUnread && styles.timeTextHighlight,
              ]}
            >
              {formatConversationTime(item.lastMessageTime)}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.lastMessageText,
                hasUnread ? styles.lastMessageUnread : styles.lastMessageRead,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || 'Bắt đầu cuộc trò chuyện'}
            </Text>

            {/* Huy hiệu số tin chưa đọc */}
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ô tìm kiếm cuộc trò chuyện */}
      {conversations.length > 0 && (
        <View style={styles.searchHeader}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm cuộc trò chuyện..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Danh sách cuộc trò chuyện */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.chatId}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MessageCircle size={44} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
            <Text style={styles.emptySubtitle}>
              Hãy sang tab Danh bạ và bắt đầu nhắn tin với bạn bè ngay!
            </Text>

            <TouchableOpacity
              style={styles.startChatButton}
              onPress={() => navigation.navigate(ROUTES.TAB_CONTACTS)}
            >
              <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.startChatText}>Bắt đầu nhắn tin</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  conversationCardUnread: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dotOnline: {
    backgroundColor: colors.online,
  },
  dotOffline: {
    backgroundColor: colors.offline,
  },
  contentContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  userNameBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timeTextHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  lastMessageRead: {
    color: colors.textSecondary,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  startChatText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
