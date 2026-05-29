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
import ProfileScreen from './src/screens/ProfileScreen';

// Icons
import { Home, MapPin, Scan, User as UserIcon } from 'lucide-react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabNavigator({ user, onLogout }: { user: User; onLogout: () => void }) {
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
        name="Bosh Sahifa"
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      >
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Xarita"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="Skaner"
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Scan size={size} color={color} />,
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
        {user ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs">
              {(props) => <MainTabNavigator {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="BookDetail" component={BookDetailScreen} />
          </Stack.Navigator>
        ) : (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
