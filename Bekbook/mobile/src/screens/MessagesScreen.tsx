import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MessageSquare, User } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function MessagesScreen() {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.log('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const renderConversation = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.convCard}
      onPress={() => navigation.navigate('Chat', { userId: item.other_id, userName: item.other_name })}
    >
      <View style={styles.avatarContainer}>
        {item.other_avatar ? (
          <Image 
            source={{ uri: item.other_avatar.startsWith('http') ? item.other_avatar : `https://bekbook.alif24.uz/api${item.other_avatar}` }} 
            style={styles.avatarImage} 
          />
        ) : (
          <User size={24} color={theme.colors.primary} />
        )}
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{item.other_name ?? `Foydalanuvchi #${item.other_id}`}</Text>
        <Text style={styles.convLastMessage} numberOfLines={1}>{item.last_body}</Text>
      </View>
      {Number(item.unread_count) > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xabarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={item => item.other_id.toString()}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <MessageSquare size={48} color={theme.colors.borderWarm} />
          <Text style={styles.emptyText}>Hali xabar yo'q</Text>
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
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
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  convInfo: {
    flex: 1,
    marginLeft: 12,
  },
  convName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  convLastMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
