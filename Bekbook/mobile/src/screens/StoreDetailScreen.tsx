import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Store as StoreIcon, MapPin, Phone, Clock, BookOpen, ArrowLeft, Crown } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService, { Store, Book } from '../services/api';

export default function StoreDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const storeId = route.params?.storeId;

  const [store, setStore] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);

  const fetchStore = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getStoreDetail(storeId);
      setStore(data);
    } catch (error) {
      console.log('Error fetching store detail:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const fetchBooks = useCallback(async () => {
    try {
      setBooksLoading(true);
      const data = await apiService.getStoreBooks(storeId);
      setBooks(data);
    } catch (error) {
      console.log('Error fetching store books:', error);
    } finally {
      setBooksLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchStore();
      fetchBooks();
    }
  }, [storeId, fetchStore, fetchBooks]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kutubxona topilmadi.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Ortga qaytish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderBookItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.bookCard}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <View style={styles.bookImageContainer}>
        {item.image ? (
          <Image source={{ uri: apiService.getImageUrl(item.image) }} style={styles.bookImage} />
        ) : (
          <View style={styles.bookImagePlaceholder}>
            <BookOpen size={24} color={theme.colors.borderWarm} />
          </View>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        {item.author && <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>}
        {item.type === 'rent' && <Text style={styles.bookType}>Ijara ({item.rentDuration} kun)</Text>}
        {item.type === 'sell' && item.price && <Text style={styles.bookPrice}>{item.price} so'm</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{store.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Store Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {store.avatar ? (
              <Image source={{ uri: apiService.getImageUrl(store.avatar) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <StoreIcon size={40} color={theme.colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.storeName}>{store.name}</Text>
          {store.description && (
            <Text style={styles.storeDescription}>{store.description}</Text>
          )}

          <View style={styles.infoRowContainer}>
            <View style={styles.infoRow}>
              <MapPin size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>{store.address}</Text>
            </View>
            {store.phone && (
              <View style={styles.infoRow}>
                <Phone size={16} color={theme.colors.primary} />
                <Text style={styles.infoText}>{store.phone}</Text>
              </View>
            )}
            {store.openHours && (
              <View style={styles.infoRow}>
                <Clock size={16} color={theme.colors.primary} />
                <Text style={styles.infoText}>{store.openHours}</Text>
              </View>
            )}
          </View>

          {/* Subscription Action */}
          <TouchableOpacity style={styles.subButton}>
            <Crown size={18} color="#fff" />
            <Text style={styles.subButtonText}>Obuna bo'lish</Text>
          </TouchableOpacity>
        </View>

        {/* Books Section */}
        <View style={styles.booksSection}>
          <Text style={styles.sectionTitle}>Kitoblar ({books.length})</Text>
          {booksLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : books.length > 0 ? (
            <FlatList
              data={books}
              keyExtractor={item => item.id.toString()}
              renderItem={renderBookItem}
              scrollEnabled={false}
              contentContainerStyle={styles.booksList}
            />
          ) : (
            <View style={styles.emptyBooks}>
              <BookOpen size={40} color={theme.colors.borderWarm} />
              <Text style={styles.emptyBooksText}>Bu do'konda hozircha kitoblar yo'q</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  storeDescription: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoRowContainer: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  subButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b', // Amber
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  subButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  booksSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  booksList: {
    gap: 12,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    alignItems: 'center',
  },
  bookImageContainer: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  bookImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  bookType: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  bookPrice: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  emptyBooks: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyBooksText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
