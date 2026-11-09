import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LogOut, User, Mail, ShieldCheck } from 'lucide-react-native';
import { auth, database } from '../../services/firebase';
import { logoutUser } from '../../services/auth.service';
import { ref, get } from 'firebase/database';
import { UserProfile } from '../../types';
import colors from '../../theme/colors';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userSnap = await get(ref(database, `users/${user.uid}`));
          if (userSnap.exists()) {
            setProfile(userSnap.val());
          } else {
            setProfile({
              uid: user.uid,
              fullName: user.displayName || 'Người dùng',
              email: user.email || '',
              status: 'online',
              createdAt: Date.now(),
            });
          }
        } catch (e) {
          console.warn('Lỗi tải thông tin user:', e);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logoutUser();
              // Sau khi logout, AuthState thay đổi và AppNavigator tự chuyển về Login
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể đăng xuất.');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Thẻ Hồ sơ */}
      <View style={styles.profileCard}>
        <Image
          source={{
            uri:
              profile?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                profile?.fullName || 'User'
              )}&background=2563EB&color=fff&size=128`,
          }}
          style={styles.avatar}
        />
        <Text style={styles.userName}>{profile?.fullName || 'Người dùng'}</Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Đang hoạt động</Text>
        </View>
      </View>

      {/* Thông tin chi tiết */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <User size={18} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Họ và tên</Text>
            <Text style={styles.infoValue}>{profile?.fullName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Mail size={18} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <ShieldCheck size={18} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Mã định danh (UID)</Text>
            <Text style={styles.infoValueUid} numberOfLines={1}>
              {profile?.uid}
            </Text>
          </View>
        </View>
      </View>

      {/* Nút Đăng xuất */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <>
            <LogOut size={20} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Đăng Xuất</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  infoValueUid: {
    fontSize: 12,
    color: colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
