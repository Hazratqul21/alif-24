import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, BellOff, CheckCheck } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

const TYPE_ICON: Record<string, string> = {
  bulk: "📢", reservation: "📚", transaction: "📖", info: "ℹ️", system: "⚙️",
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.log('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleReadAll = async () => {
    try {
      await apiService.markAllNotificationsRead();
      fetchNotifications();
    } catch (error) {
      console.log('Error marking all as read:', error);
    }
  };

  const handlePressNotification = async (item: any) => {
    if (!item.readAt) {
      try {
        await apiService.markNotificationRead(item.id);
        fetchNotifications();
      } catch (error) {
        console.log('Error marking notification read:', error);
      }
    }

    if (item.link) {
      // Very basic internal link handling or open browser
      if (item.link.startsWith('http')) {
        Linking.openURL(item.link);
      } else {
        // e.g. /books/5 could be handled here by navigation, but simplified for now
        // navigation.navigate('BookDetail', { bookId: 5 })
      }
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const isUnread = !item.readAt;

    return (
      <TouchableOpacity 
        style={[styles.card, isUnread ? styles.cardUnread : styles.cardRead]}
        onPress={() => handlePressNotification(item)}
      >
        <Text style={styles.iconText}>{TYPE_ICON[item.type] || "🔔"}</Text>
        <View style={styles.cardContent}>
          <Text style={[styles.title, isUnread && styles.titleUnread]}>{item.title}</Text>
          {item.body && <Text style={styles.bodyText}>{item.body}</Text>}
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleString('ru-RU')}
          </Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Bell size={20} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>Bildirishnomalar</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.readAllButton} onPress={handleReadAll}>
            <CheckCheck size={16} color={theme.colors.textMuted} />
            <Text style={styles.readAllText}>Barchasini o'qildi</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <BellOff size={48} color={theme.colors.borderWarm} />
          <Text style={styles.emptyText}>Hali bildirishnoma yo'q</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  readAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  readAllText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  cardRead: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderWarm,
    opacity: 0.8,
  },
  iconText: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: 'bold',
  },
  bodyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
});
