import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, X, MessageSquare, Users, UserCheck } from 'lucide-react-native';
import { auth } from '../../services/firebase';
import { subscribeUsersList, setupPresence } from '../../services/user.service';
import { UserProfile } from '../../types';
import { ROUTES } from '../../navigation/routes';
import { formatLastSeen } from '../../utils/time';
import colors from '../../theme/colors';

export default function ContactsScreen({ navigation }: any) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setLoading(false);
      return;
    }

    // 1. Cài đặt Presence cho chính mình (để người khác thấy mình online)
    const cleanupPresence = setupPresence(currentUid);

    // 2. Lắng nghe danh sách người dùng realtime từ Firebase
    const unsubscribeUsers = subscribeUsersList(
      currentUid,
      (data) => {
        setUsers(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.warn('Lỗi tải danh bạ:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    // BẮT BUỘC: Hủy lắng nghe trong cleanup của useEffect theo đúng yêu cầu đề bài
    return () => {
      cleanupPresence();
      unsubscribeUsers();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Realtime listener của Firebase sẽ tự động cập nhật, ta chỉ cần mô phỏng refresh
    setTimeout(() => setRefreshing(false), 800);
  };

  // Lọc theo ô tìm kiếm (tìm theo họ tên hoặc email)
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Đếm số người đang online
  const onlineCount = useMemo(() => {
    return users.filter((u) => u.status === 'online').length;
  }, [users]);

  // Điều hướng sang màn hình Chat 1-1 khi nhấn vào một người
  const handleOpenChat = (user: UserProfile) => {
    navigation.navigate(ROUTES.CHAT, { receiver: user });
  };

  const renderContactItem = ({ item }: { item: UserProfile }) => {
    const isOnline = item.status === 'online';

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar kèm chấm Online/Offline */}
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  item.fullName
                )}&background=2563EB&color=fff&size=96`,
            }}
            style={styles.avatar}
          />
          <View
            style={[
              styles.statusDot,
              isOnline ? styles.statusOnline : styles.statusOffline,
            ]}
          />
        </View>

        {/* Thông tin người dùng */}
        <View style={styles.infoContainer}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.fullName}
          </Text>
          <Text
            style={[
              styles.statusText,
              isOnline ? styles.onlineText : styles.offlineText,
            ]}
            numberOfLines={1}
          >
            {isOnline ? 'Đang hoạt động' : formatLastSeen(item.lastSeen)}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {item.email}
          </Text>
        </View>

        {/* Nút Chat */}
        <View style={styles.chatAction}>
          <MessageSquare size={20} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải danh bạ người dùng...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ô tìm kiếm */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên hoặc email..."
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

        {/* Thống kê online */}
        <View style={styles.statsBar}>
          <View style={styles.statsItem}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={styles.statsText}>{users.length} người dùng</Text>
          </View>
          <View style={styles.statsItem}>
            <UserCheck size={14} color={colors.online} />
            <Text style={[styles.statsText, { color: colors.online, fontWeight: '600' }]}>
              {onlineCount} đang online
            </Text>
          </View>
        </View>
      </View>

      {/* Danh sách người dùng */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        renderItem={renderContactItem}
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
            <Users size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? 'Không tìm thấy người dùng'
                : 'Chưa có người dùng nào khác'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Không có ai khớp với từ khóa "${searchQuery}"`
                : 'Hãy đăng ký thêm tài khoản để bắt đầu trải nghiệm chat 1-1'}
            </Text>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  statusOnline: {
    backgroundColor: colors.online,
  },
  statusOffline: {
    backgroundColor: colors.offline,
  },
  infoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  onlineText: {
    color: colors.online,
  },
  offlineText: {
    color: colors.textMuted,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 14,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
