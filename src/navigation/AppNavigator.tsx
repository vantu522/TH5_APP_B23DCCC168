import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { User } from 'firebase/auth';
import { subscribeAuthState } from '../services/auth.service';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import ChatScreen from '../screens/chat/ChatScreen';
import { ROUTES } from './routes';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Lắng nghe trạng thái đăng nhập từ Firebase Auth
    const unsubscribe = subscribeAuthState((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {currentUser ? (
        // Đã đăng nhập: hiển thị MainTabs và ChatScreen
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name={ROUTES.CHAT}
            component={ChatScreen}
            options={{
              headerShown: false, // Custom Header sẽ được làm trong ChatScreen
            }}
          />
        </>
      ) : (
        // Chưa đăng nhập: hiển thị AuthStack
        <Stack.Screen name="AuthStack" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
