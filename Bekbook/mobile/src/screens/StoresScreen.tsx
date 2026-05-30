import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Store as StoreIcon, MapPin, BookOpen, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import apiService, { Store } from '../services/api';

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<any>();

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getStores();
      setStores(data);
    } catch (error) {
      console.log('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStoreItem = ({ item }: { item: Store }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('StoreDetail', { storeId: item.id })}
    >
      <View style={styles.cardHeader}>
        {item.avatar ? (
          <Image source={{ uri: apiService.getImageUrl(item.avatar) }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <StoreIcon size={24} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.storeInfo}>
          <Text style={styles.storeName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.locationContainer}>
            <MapPin size={12} color={theme.colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{item.address}</Text>
          </View>
        </View>
      </View>
      
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.statsContainer}>
          <BookOpen size={14} color={theme.colors.textMuted} />
          <Text style={styles.statsText}>Ko'p kitoblar</Text> 
        </View>
        {item.openHours ? (
          <Text style={styles.statsText}>{item.openHours}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kutubxonalar</Text>
          <Text style={styles.subtitle}>Yaqinidagi kutubxonalar va kitob do'konlari</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('StoreNew')}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kutubxona qidirish..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredStores.length > 0 ? (
        <FlatList
          data={filteredStores}
          keyExtractor={item => item.id.toString()}
          renderItem={renderStoreItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <StoreIcon size={64} color={theme.colors.borderWarm} />
          <Text style={styles.emptyTitle}>Kutubxona topilmadi</Text>
          <Text style={styles.emptySubtitle}>Birinchi bo'lib kutubxona qo'shing</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for bottom tab
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 4,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderWarm,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});
