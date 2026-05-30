import React, { useState, useEffect } from 'react';
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
  SafeAreaView,
  Linking
} from 'react-native';
import { theme } from '../theme/theme';
import apiService, { Book, User } from '../services/api';
import { Search, Filter, BookOpen, AlertTriangle, ChevronRight, Bell, ShoppingCart, MessageSquare, Plus, Heart, Star, MapPin } from 'lucide-react-native';
import { useCart } from '../store/cartStore';

interface HomeScreenProps {
  navigation: any;
  user: User | null;
  tabType: 'store' | 'user';
}

export default function HomeScreen({ navigation, user, tabType }: HomeScreenProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'rent' | 'free' | 'sell'>('all');
  const [stats, setStats] = useState({ total: 0, activeLends: 0, overdue: 0 });
  const { items, add } = useCart();

  const fetchBooks = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await apiService.getBooks({
        search: search || undefined,
        type: activeType === 'all' ? undefined : activeType
      });
      
      // Filter based on tabType
      const filteredData = data.filter(book => {
        const isStoreOwner = book.user?.role === 'store_owner';
        if (tabType === 'store') return isStoreOwner;
        if (tabType === 'user') return !isStoreOwner;
        return true;
      });

      setBooks(filteredData);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooks();
    // Simulate or calculate simple dashboard stats
    setStats({ total: 120, activeLends: 2, overdue: 1 });
  }, [activeType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBooks(true);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchBooks();
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
          image: item.image || (Array.isArray(item.images) ? item.images[0] : item.images)
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
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
          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={() => {
              if (!user) navigation.navigate('Login');
              else navigation.navigate('Messages');
            }}
          >
            <MessageSquare size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => {
              if (!user) navigation.navigate('Login');
              else navigation.navigate('Notifications');
            }}
          >
            <Bell size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.headerIconBtn}>
            <ShoppingCart size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overdue alert banner if necessary */}
        {stats.overdue > 0 && (
          <View style={styles.alertBanner}>
            <AlertTriangle size={20} color={theme.colors.danger} />
            <Text style={styles.alertText}>
              Diqqat! Qaytarish muddati o'tgan kitobingiz bor.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profil')}>
              <Text style={styles.alertAction}>Ko'rish</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kitoblar, mualliflar yoki janrlar..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={handleSearchSubmit}>
            <Filter size={20} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>

        {/* Filter Quick Pills */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'rent', label: 'Ijaraga' },
              { id: 'free', label: 'Tekinga' },
              { id: 'sell', label: 'Sotiladigan' },
            ].map((pill) => (
              <TouchableOpacity
                key={pill.id}
                style={[
                  styles.pill,
                  activeType === pill.id && styles.pillActive
                ]}
                onPress={() => setActiveType(pill.id as any)}
              >
                <Text style={[
                  styles.pillText,
                  activeType === pill.id && styles.pillTextActive
                ]}>
                  {pill.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stats Grid Dashboard Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsHeader}>Mahallada kitob almashinuvi</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLabel}>Jami kitoblar</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.colors.info }]}>{stats.activeLends}</Text>
              <Text style={styles.statLabel}>O'qilmoqda</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: theme.colors.danger }]}>{stats.overdue}</Text>
              <Text style={styles.statLabel}>Muddati o'tgan</Text>
            </View>
          </View>
        </View>

        {/* Books List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>E'lonlar ro'yxati</Text>
          <TouchableOpacity style={styles.viewAllBtn} onPress={fetchBooks}>
            <Text style={styles.viewAllText}>Barchasi</Text>
            <ChevronRight size={16} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : books.length === 0 ? (
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
        )}
      </ScrollView>

      {/* Floating Action Button for adding a book */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          if (!user) navigation.navigate('Login');
          else navigation.navigate('BookNew');
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    
  },
  header: {
    height: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  welcomeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    paddingTop: 30,
  },
  userName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    
  },
  headerActions: {
    paddingTop: 30,
    flexDirection: 'row',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertText: {
    flex: 1,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.danger,
    marginLeft: theme.spacing.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  alertAction: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.info,
    fontWeight: theme.typography.weights.bold,
    marginLeft: theme.spacing.sm,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: theme.roundness.md,
    paddingHorizontal: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: theme.colors.text,
  },
  filterBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.roundness.md,
    marginLeft: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  filterRow: {
    marginVertical: theme.spacing.md,
  },
  pillsScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  pill: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: theme.roundness.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  pillTextActive: {
    color: theme.colors.surface,
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  statsHeader: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.secondary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
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
});
