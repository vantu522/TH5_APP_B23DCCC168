import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, Bell, Settings } from 'lucide-react-native';
import { auth } from '../services/firebase';
import { subscribeUserConversations } from '../services/chat.service';
import HomeScreen from '../screens/home/HomeScreen';
import ContactsScreen from '../screens/contacts/ContactsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { ROUTES } from './routes';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const [totalUnread, setTotalUnread] = useState<number>(0);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Lắng nghe tổng số tin chưa đọc để hiển thị Badge trên Tab Bar
    const unsubscribe = subscribeUserConversations(currentUid, (conversations) => {
      const sum = conversations.reduce((acc, cur) => acc + (cur.unreadCount || 0), 0);
      setTotalUnread(sum);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Tab.Navigator
      initialRouteName={ROUTES.TAB_HOME}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: colors.text,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name={ROUTES.TAB_HOME}
        component={HomeScreen}
        options={{
          title: 'Đoạn chat',
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
          },
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.TAB_CONTACTS}
        component={ContactsScreen}
        options={{
          title: 'Danh bạ',
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.TAB_NOTIFICATIONS}
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color, size }) => (
            <Bell color={color} size={size || 22} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.TAB_SETTINGS}
        component={SettingsScreen}
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size || 22} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
