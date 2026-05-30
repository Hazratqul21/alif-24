import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { theme } from './src/theme/theme';
import apiService, { User } from './src/services/api';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';
import ScanScreen from './src/screens/ScanScreen';
import MapScreen from './src/screens/MapScreen';
import MapPickerScreen from './src/screens/MapPickerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StoresScreen from './src/screens/StoresScreen';
import StoreDetailScreen from './src/screens/StoreDetailScreen';
import StoreNewScreen from './src/screens/StoreNewScreen';
import StoreCatalogNewScreen from './src/screens/StoreCatalogNewScreen';
import StoreReadersScreen from './src/screens/StoreReadersScreen';
import AdminScreen from './src/screens/AdminScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import StoreOwnerPayScreen from './src/screens/StoreOwnerPayScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ChatScreen from './src/screens/ChatScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import CartScreen from './src/screens/CartScreen';
import BookNewScreen from './src/screens/BookNewScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import Alif24Screen from './src/screens/Alif24Screen';

import { Home, MapPin, Scan, User as UserIcon, Library, BookOpen, Globe } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabNavigator({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary, 
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderWarm,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 40,
          left: 16,
          right: 16,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Asosiy"
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      >
        {(props) => <HomeScreen {...props} user={user} tabType="store" />}
      </Tab.Screen>

      <Tab.Screen
        name="Ikkinchi qo'l"
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      >
        {(props) => <HomeScreen {...props} user={user} tabType="user" />}
      </Tab.Screen>

      <Tab.Screen
        name="Kutubxonalar"
        component={StoresScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Library size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="Alif24"
        component={Alif24Screen}
        options={{
          tabBarIcon: ({ color, size }) => <Globe size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="Profil"
        options={{
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
        }}
      >
        {(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync('mahalla_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        // Verify token validity by calling API profile me
        const freshUser = await apiService.getMe();
        setUser(freshUser);
      }
    } catch (error) {
      console.log('Auth check or token validation failed, logging out.');
      await apiService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = async () => {
    const storedUser = await SecureStore.getItemAsync('mahalla_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
  };

  if (loading) {
    return null; // Keep splash active or a spinner
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.colors.surface} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs">
            {(props) => <MainTabNavigator {...props} user={user} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLoginSuccess={() => { props.navigation.goBack(); handleLoginSuccess(); }} />}
          </Stack.Screen>
          <Stack.Screen name="BookDetail" component={BookDetailScreen} />
          <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
          <Stack.Screen name="StoreNew" component={StoreNewScreen} />
          <Stack.Screen name="MapPicker" component={MapPickerScreen} />
          <Stack.Screen name="StoreCatalogNew" component={StoreCatalogNewScreen} />
          <Stack.Screen name="StoreReaders" component={StoreReadersScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Invoices" component={InvoicesScreen} />
          <Stack.Screen name="StoreOwnerPay" component={StoreOwnerPayScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Cart">
            {(props) => <CartScreen {...props} user={user} />}
          </Stack.Screen>
          <Stack.Screen name="BookNew">
            {(props) => <BookNewScreen {...props} user={user} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
