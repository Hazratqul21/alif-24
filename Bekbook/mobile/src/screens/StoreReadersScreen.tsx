import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Users, Search, AlertTriangle, CheckCircle, Phone } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function StoreReadersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const storeId = route.params?.storeId;

  const [readers, setReaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReaders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getStoreReaders(storeId);
      setReaders(data.readers || []);
    } catch (error) {
      console.log('Error fetching readers:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchReaders();
  }, [fetchReaders]);

  const handleToggleBlacklist = async (userId: number, currentStatus: string | boolean) => {
    try {
      const isBlacklisted = currentStatus === true || currentStatus === 'true';
      await apiService.updateUserCategory(userId, { isBlacklisted: !isBlacklisted });
      fetchReaders();
    } catch (error) {
      Alert.alert('Xatolik', 'Holatni o\'zgartirishda xatolik yuz berdi');
    }
  };

  const filteredReaders = readers.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.phone && r.phone.includes(searchQuery))
  );

  const renderReaderItem = ({ item }: { item: any }) => {
    const isBlacklisted = item.isBlacklisted === true || item.isBlacklisted === 'true';

    return (
      <View style={[styles.card, isBlacklisted && styles.cardBlacklisted]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, isBlacklisted ? styles.avatarBlacklisted : null]}>
            <Text style={[styles.avatarText, isBlacklisted ? styles.avatarTextBlacklisted : null]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {item.phone && (
              <View style={styles.phoneRow}>
                <Phone size={12} color={theme.colors.textMuted} />
                <Text style={styles.phoneText}>{item.phone}</Text>
              </View>
            )}
            <Text style={styles.statsText}>Aktiv ijara: {item.activeLoanCount}</Text>
          </View>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionBtn, isBlacklisted ? styles.actionBtnActive : null]}
            onPress={() => handleToggleBlacklist(item.userId, item.isBlacklisted)}
          >
            {isBlacklisted ? (
              <>
                <CheckCircle size={16} color="#059669" />
                <Text style={[styles.actionBtnText, { color: '#059669' }]}>Ro'yxatdan chiqarish</Text>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color="#e11d48" />
                <Text style={[styles.actionBtnText, { color: '#e11d48' }]}>Qora ro'yxatga qo'shish</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>O'quvchilar ro'yxati</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ism yoki telefon orqali izlash..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredReaders.length > 0 ? (
        <FlatList
          data={filteredReaders}
          keyExtractor={item => item.userId.toString()}
          renderItem={renderReaderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Users size={48} color={theme.colors.borderWarm} />
          <Text style={styles.emptyText}>O'quvchilar topilmadi</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: theme.colors.text,
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  cardBlacklisted: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlacklisted: {
    backgroundColor: '#ffe4e6',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  avatarTextBlacklisted: {
    color: '#e11d48',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  statsText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderWarm,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fda4af',
    backgroundColor: '#fff1f2',
  },
  actionBtnActive: {
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
