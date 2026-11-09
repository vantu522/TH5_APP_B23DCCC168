import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  MessageSquare,
  ShieldCheck,
  MapPin,
  CheckCheck,
} from 'lucide-react-native';
import { getCurrentLocation } from '../../services/location.service';
import colors from '../../theme/colors';

interface NotificationItem {
  id: string;
  type: 'message' | 'system' | 'location';
  title: string;
  content: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    type: 'system',
    title: 'Đăng nhập thành công',
    content: 'Tài khoản của bạn đã được xác thực an toàn qua Firebase Authentication.',
    time: 'Vừa xong',
    read: false,
  },
  {
    id: '2',
    type: 'message',
    title: 'Tin nhắn mới',
    content: 'Bạn có một tin nhắn mới trong phòng chat 1-1 thời gian thực.',
    time: '5 phút trước',
    read: false,
  },
  {
    id: '3',
    type: 'system',
    title: 'Hệ thống Realtime Database',
    content: 'Kết nối mạng Firebase Realtime Database đang hoạt động ổn định.',
    time: 'Hôm nay',
    read: true,
  },
  {
    id: '4',
    type: 'location',
    title: 'Dịch vụ định vị',
    content: 'Quyền truy cập vị trí Geolocation đã sẵn sàng để gửi tọa độ GPS.',
    time: 'Hôm qua',
    read: true,
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  // Đánh dấu 1 mục đã đọc
  const handleToggleItem = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  // Kiểm tra vị trí GPS với Geolocation
  const handleCheckLocation = async () => {
    setLoadingLocation(true);
    try {
      const coords = await getCurrentLocation();
      const newNotif: NotificationItem = {
        id: Date.now().toString(),
        type: 'location',
        title: 'Tọa độ GPS hiện tại',
        content: `Vĩ độ (Lat): ${coords.latitude.toFixed(5)}, Kinh độ (Lng): ${coords.longitude.toFixed(5)}`,
        time: 'Vừa xong',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      Alert.alert(
        'Định vị thành công',
        `Tọa độ của bạn:\nLatitude: ${coords.latitude}\nLongitude: ${coords.longitude}`
      );
    } catch (err: any) {
      Alert.alert('Lỗi định vị', err?.message || 'Không thể lấy tọa độ hiện tại.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const filteredData = notifications.filter((item) => {
    if (filter === 'unread') return !item.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare size={20} color={colors.primary} />;
      case 'location':
        return <MapPin size={20} color={colors.secondary} />;
      default:
        return <ShieldCheck size={20} color="#F59E0B" />;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, !item.read && styles.unreadCard]}
      onPress={() => handleToggleItem(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>{renderIcon(item.type)}</View>

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text
            style={[styles.itemTitle, !item.read && styles.itemTitleBold]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.itemTime}>{item.time}</Text>
        </View>

        <Text style={styles.itemDesc}>{item.content}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Bộ lọc và nút thao tác */}
      <View style={styles.headerBar}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, filter === 'all' && styles.tabActive]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.tabText,
                filter === 'all' && styles.tabTextActive,
              ]}
            >
              Tất cả ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filter === 'unread' && styles.tabActive]}
            onPress={() => setFilter('unread')}
          >
            <Text
              style={[
                styles.tabText,
                filter === 'unread' && styles.tabTextActive,
              ]}
            >
              Chưa đọc ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={handleMarkAllAsRead}
        >
          <CheckCheck size={16} color={colors.primary} />
          <Text style={styles.markReadText}>Đã đọc</Text>
        </TouchableOpacity>
      </View>

      {/* Nút kiểm tra Geolocation */}
      <View style={styles.locationActionWrapper}>
        <TouchableOpacity
          style={styles.locationCheckBtn}
          onPress={handleCheckLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MapPin size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.locationCheckText}>
                Kiểm tra tọa độ GPS (@react-native-community/geolocation)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Danh sách thông báo */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread'
                ? 'Bạn đã đọc toàn bộ thông báo!'
                : 'Chưa có thông báo mới từ hệ thống.'}
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.background,
  },
  tabActive: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationActionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  locationCheckBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#059669', // Emerald 600
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  locationCheckText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  itemCard: {
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
  unreadCard: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  itemTitleBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  itemTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
