import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import { theme } from '../theme/theme';
import apiService, { Book, User, Store } from '../services/api';
import { Search, Filter, BookOpen, ArrowUpDown, ChevronRight, Bell, ShoppingCart, MessageSquare, Plus, Heart, Star, MapPin, Store as StoreIcon, Library, LocateFixed } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useCart } from '../store/cartStore';

interface HomeScreenProps {
  navigation: any;
  user: User | null;
  tabType: 'store' | 'user';
}

export default function HomeScreen({ navigation, user, tabType }: HomeScreenProps) {
  const [viewMode, setViewMode] = useState<'books' | 'stores' | 'map'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const mapRef = useRef<MapView>(null);
  const [activeType, setActiveType] = useState<'all' | 'rent' | 'free' | 'sell'>('all');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeSort, setActiveSort] = useState('newest');
  const [activeGenre, setActiveGenre] = useState('');
  const [selectedMapItem, setSelectedMapItem] = useState<{ type: 'store'; data: any } | null>(null);
  const { items, add } = useCart();

  const fetchData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    
    let newBooks: Book[] = [];
    let newStores: Store[] = [];
    
    try {
      const data = await apiService.getBooks({
        search: search || undefined,
        type: activeType === 'all' ? undefined : activeType
      });
      newBooks = data.filter(book => {
        const isStoreOwner = book.user?.role === 'store_owner';
        if (tabType === 'store') return isStoreOwner;
        if (tabType === 'user') return !isStoreOwner;
        return true;
      });
    } catch (error) {
      console.log('Error fetching books:', error);
    }

    try {
      const stores = await apiService.getStores();
      newStores = stores;
    } catch (error) {
      console.log('Error fetching stores:', error);
    }
    
    setBooks(newBooks);
    setStores(newStores);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeType, viewMode]);

  useEffect(() => {
    if (viewMode === 'map') {
      (async () => {
        try {
          await Location.requestForegroundPermissionsAsync();
        } catch (e) {
          console.log('Permission request error:', e);
        }
      })();
    }
  }, [viewMode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchData();
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    const imageUrl = apiService.getImageUrl(item.image || item.images);
    const isSell = item.type === 'sell';
    const isRent = item.type === 'rent';
    const isFree = item.type === 'free';
    
    // Mock rating for now
    const rating = 4.5;
    const reviews = 0;
    
    const installmentPrice = Math.round((item.price || 0) / 12).toLocaleString();
    const isInCart = items.some(cartItem => cartItem.bookId === item.id);
    
    const handleAddToCart = () => {
      if (isInCart) {
        navigation.navigate('Cart');
      } else {
        add({
          bookId: item.id,
          title: item.title,
          author: item.author || 'Noma\'lum muallif',
          price: item.price,
          image: item.image || (Array.isArray(item.images) ? item.images[0] : item.images) || null
        });
      }
    };

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
        activeOpacity={0.9}
      >
        {/* Cover Section */}
        <View style={styles.bookCoverContainer}>
          <Image source={{ uri: imageUrl }} style={styles.bookImage} resizeMode="cover" />
          
          {/* Top-left Badge */}
          <View style={styles.badgeContainer}>
            <Text style={[
              styles.typeBadge, 
              isSell ? styles.badge_sell : isFree ? styles.badge_free : styles.badge_rent
            ]}>
              {isSell ? 'SOTILADI' : isFree ? 'BEPUL' : 'IJARA'}
            </Text>
          </View>
          
          {/* Top-right Favorite Button */}
          <TouchableOpacity style={styles.favoriteBtn}>
            <Heart size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.bookInfo}>
          {/* Genre */}
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{item.genre?.toUpperCase() || 'BADIIY ADABIYOT'}</Text>
          </View>

          {/* Title & Author */}
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.author || 'Muallif noma\'lum'}</Text>

          {/* Ratings */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={12} color="#FFB800" fill={i <= Math.floor(rating) ? "#FFB800" : "transparent"} />
              ))}
            </View>
            <Text style={styles.ratingText}>{rating}</Text>
            <Text style={styles.reviewsText}>({reviews})</Text>
          </View>

          <View style={styles.divider} />

          {/* Price Section */}
          <Text style={styles.priceLabel}>Narxi</Text>
          <Text style={styles.bookPrice}>
            {isFree ? 'Bepul' : `${(item.price || 0).toLocaleString()} so'm`}
          </Text>

          {/* Installment Badge */}
          {isSell && (
            <View style={styles.installmentBadge}>
              <Text style={styles.installmentLabel}>MUDDATLI{'\n'}TO'LOV</Text>
              <Text style={styles.installmentValue}>{installmentPrice}{'\n'}SO'M / OY</Text>
            </View>
          )}

          {/* Action Button */}
          {isSell && (
            <TouchableOpacity 
              style={[styles.addToCartBtn, isInCart && styles.addToCartBtnActive]}
              onPress={handleAddToCart}
            >
              <ShoppingCart size={16} color={isInCart ? "#94A3B8" : "#FFF"} style={{ marginRight: 6 }} />
              <Text style={[styles.addToCartText, isInCart && styles.addToCartTextActive]}>
                {isInCart ? 'Savatda' : 'Savatga qo\'shish'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Footer (Owner & Location) */}
          <View style={styles.bookFooter}>
            <Text style={styles.footerText} numberOfLines={1}>
              {item.user?.name || 'Kutubxon'}
            </Text>
            <MapPin size={10} color={theme.colors.textMuted} style={{ marginHorizontal: 2 }} />
            <Text style={styles.footerText} numberOfLines={1}>
              {item.address || 'Toshkent shah'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStoreItem = ({ item }: { item: Store }) => (
    <TouchableOpacity 
      style={styles.storeCard}
      onPress={() => navigation.navigate('StoreDetail', { storeId: item.id })}
    >
      <View style={styles.storeCardHeader}>
        {item.avatar ? (
          <Image source={{ uri: apiService.getImageUrl(item.avatar) }} style={styles.storeAvatar} />
        ) : (
          <View style={styles.storeAvatarPlaceholder}>
            <StoreIcon size={24} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.storeInfoDetails}>
          <Text style={styles.storeCardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.locationContainer}>
            <MapPin size={12} color={theme.colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{item.address}</Text>
          </View>
        </View>
      </View>
      {item.description ? (
        <Text style={styles.storeDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Unified Absolute Header */}
      <View style={styles.absoluteHeader}>
        {/* Header Banner */}
        <View style={styles.headerBannerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => Linking.openURL('https://alif24.uz')}>
              <Image 
                source={{ uri: 'https://alif24.uz/images/logo.png' }} 
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surface }} 
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.welcomeText}>Assalomu alaykum,</Text>
              <Text style={styles.userName}>{user ? (user.name?.split(' ')[0] || 'Foydalanuvchi') : 'Mehmon'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => { if (!user) navigation.navigate('Login'); else navigation.navigate('Messages'); }}>
              <MessageSquare size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => { if (!user) navigation.navigate('Login'); else navigation.navigate('Notifications'); }}>
              <Bell size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.headerIconBtn}>
              <ShoppingCart size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Tabs */}
        <View style={styles.searchAndTabsContent}>
          <View style={styles.navRow1}>
            <View style={styles.searchContainer}>
              <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Qidiruv..."
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearchSubmit}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setSortModalVisible(true)}>
              <ArrowUpDown size={18} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setFilterModalVisible(true)}>
              <Filter size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.navRow2}>
            <TouchableOpacity 
              style={[styles.navTab, viewMode === 'books' && styles.navTabActive]} 
              onPress={() => setViewMode('books')}
            >
              <Text style={viewMode === 'books' ? styles.navTabTextActive : styles.navTabText}>Ro'yxat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.navTab, viewMode === 'stores' && styles.navTabActive]} 
              onPress={() => setViewMode('stores')}
            >
              <Text style={viewMode === 'stores' ? styles.navTabTextActive : styles.navTabText}>Do'kon</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.navTab, viewMode === 'map' && styles.navTabActive]} 
              onPress={() => setViewMode('map')}
            >
              <Text style={viewMode === 'map' ? styles.navTabTextActive : styles.navTabText}>Xarita</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: 41.311081,
              longitude: 69.240562,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
          >
            {stores.map((store) => {
              const lat = store.lat || 41.311081 + (Math.random() - 0.5) * 0.02;
              const lng = store.lng || 69.240562 + (Math.random() - 0.5) * 0.02;
              return (
                <Marker
                  key={`store-${store.id}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  pinColor={theme.colors.secondary}
                  onPress={() => setSelectedMapItem({ type: 'store', data: store })}
                >
                  <Callout tooltip>
                    <View style={styles.calloutCard}>
                      <Text style={styles.calloutTitle}>{store.name}</Text>
                      <Text style={styles.calloutSub}>Do'kon</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
          
          {selectedMapItem && (
            <View style={styles.detailCardOverlay}>
              <View style={styles.cardHeader}>
                <View style={styles.cardBadge}>
                  <StoreIcon size={16} color={theme.colors.secondary} />
                  <Text style={[styles.badgeText, { color: theme.colors.secondary }]}>Do'kon</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMapItem(null)}>
                  <Text style={styles.closeText}>Yopish</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardTitle}>{selectedMapItem.data.name}</Text>
              <Text style={styles.cardSubText}>{selectedMapItem.data.address}</Text>
              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => navigation.navigate('StoreDetail', { storeId: selectedMapItem.data.id })}
              >
                <Text style={styles.viewBtnText}>Batafsil ko'rish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingTop: 200, paddingBottom: 100 }}
        >

          {viewMode === 'books' && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>E'lonlar ro'yxati</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => fetchData()}>
                <Text style={styles.viewAllText}>Barchasi</Text>
                <ChevronRight size={16} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
          ) : viewMode === 'books' ? (
            books.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Kitoblar topilmadi.</Text>
              </View>
            ) : (
              <FlatList
                data={books}
                renderItem={renderBookItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.rowWrapper}
                contentContainerStyle={styles.listContainer}
              />
            )
          ) : (
            stores.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Do'konlar topilmadi.</Text>
              </View>
            ) : (
              <FlatList
                data={stores
                  .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
                  .sort((a, b) => {
                    if (user && a.ownerId === user.id) return -1;
                    if (user && b.ownerId === user.id) return 1;
                    return 0;
                  })
                }
                renderItem={renderStoreItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
              />
            )
          )}
        </ScrollView>
      )}

      {/* Floating Action Button for adding a book */}
      {user?.role === 'store_owner' && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('BookNew')}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Sort Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Saralash</Text>
            {[
              { id: 'price_asc', label: 'Arzondan qimmatga' },
              { id: 'price_desc', label: 'Qimmatdan arzonga' },
              { id: 'newest', label: 'Yangi qo\'shilganlar' },
              { id: 'top_rated', label: 'Yuqori reytingli' },
              { id: 'popular', label: 'Ko\'p buyurtma qilingan' },
            ].map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.modalOption}
                onPress={() => { setActiveSort(item.id); setSortModalVisible(false); fetchData(); }}
              >
                <Text style={[styles.modalOptionText, activeSort === item.id && styles.modalOptionActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Janr bo'yicha</Text>
            {[
              { id: '', label: 'Barcha janrlar' },
              { id: 'badiiy', label: 'Badiiy adabiyot' },
              { id: 'jahon', label: 'Jahon adabiyoti' },
              { id: 'diniy', label: 'Diniy adabiyot' },
              { id: 'biznes', label: 'Biznes va psixologiya' },
            ].map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.modalOption}
                onPress={() => { setActiveGenre(item.id); setFilterModalVisible(false); fetchData(); }}
              >
                <Text style={[styles.modalOptionText, activeGenre === item.id && styles.modalOptionActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 30,
    backgroundColor: theme.colors.surface,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  headerBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  searchAndTabsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  navRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: theme.colors.text,
    fontSize: 13,
  },
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  navTabActive: {
    backgroundColor: theme.colors.primary,
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  navTabTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  welcomeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.secondary,
    fontWeight: theme.typography.weights.semibold,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  rowWrapper: {
    justifyContent: 'space-between',
  },
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '48%',
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9', // light gray border
    overflow: 'hidden',
  },
  bookCoverContainer: {
    position: 'relative',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bookImage: {
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  badge_rent: {
    backgroundColor: '#3B82F6', // blue-500
  },
  badge_free: {
    backgroundColor: '#10B981', // emerald-500
  },
  badge_sell: {
    backgroundColor: '#F59E0B', // amber-500
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bookInfo: {
    padding: 12,
  },
  genreBadge: {
    backgroundColor: '#FFFBEB', // amber-50
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  genreText: {
    color: '#D97706', // amber-600
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    minHeight: 36, // Ensure consistent height for 2 lines
  },
  bookAuthor: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },
  reviewsText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  bookPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  installmentBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB', // amber-50
    borderWidth: 1,
    borderColor: '#FDE68A', // amber-200
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  installmentLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E', // amber-800
    lineHeight: 12,
  },
  installmentValue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706', // amber-600
    lineHeight: 12,
    textAlign: 'right',
  },
  addToCartBtn: {
    backgroundColor: '#F59E0B', // amber-500
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  addToCartBtnActive: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addToCartTextActive: {
    color: '#64748B',
  },
  bookFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 9,
    color: '#94A3B8',
    flexShrink: 1,
  },
  loader: {
    marginVertical: theme.spacing.xl,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
  fab: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  storeCard: {
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
    elevation: 4,
  },
  storeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  storeAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfoDetails: {
    flex: 1,
    marginLeft: 12,
  },
  storeCardName: {
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
  storeDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 12,
    lineHeight: 18,
  },
  mapContainer: {
    flex: 1,
    paddingTop: 180,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 180,
  },
  calloutCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    width: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    color: theme.colors.text,
  },
  calloutSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  detailCardOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  closeText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  cardSubText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  viewBtn: {
    height: 40,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  modalOptionActive: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  locateBtn: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#bebeb2ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
});
