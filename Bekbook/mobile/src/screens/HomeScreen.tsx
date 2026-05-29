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
  SafeAreaView
} from 'react-native';
import { theme } from '../theme/theme';
import apiService, { Book } from '../services/api';
import { Search, Filter, BookOpen, AlertTriangle, ChevronRight, Bell, ShoppingCart, MessageSquare, Plus } from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any;
  user: any;
}

export default function HomeScreen({ navigation, user }: HomeScreenProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'rent' | 'free' | 'sell'>('all');
  const [stats, setStats] = useState({ total: 0, activeLends: 0, overdue: 0 });

  const fetchBooks = async () => {
    try {
      const typeParam = activeType === 'all' ? undefined : activeType;
      const data = await apiService.getBooks({
        search: search || undefined,
        type: typeParam
      });
      setBooks(data);
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
    fetchBooks();
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchBooks();
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    const imageUrl = item.images && typeof item.images === 'string'
      ? item.images.startsWith('http') ? item.images : `https://bekbook.alif24.uz/api/uploads/${item.images}`
      : Array.isArray(item.images) && item.images.length > 0
        ? item.images[0].startsWith('http') ? item.images[0] : `https://bekbook.alif24.uz/api/uploads/${item.images[0]}`
        : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400';

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
      >
        <Image source={{ uri: imageUrl }} style={styles.bookImage} resizeMode="cover" />
        <View style={styles.badgeContainer}>
          <Text style={[styles.typeBadge, styles[`badge_${item.type}` as keyof typeof styles]]}>
            {item.type === 'rent' ? 'Ijara' : item.type === 'free' ? 'Tekinga' : 'Sotish'}
          </Text>
        </View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
          <Text style={styles.bookPrice}>
            {item.type === 'free' ? 'Bepul' : `${item.price.toLocaleString()} so'm`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Assalomu alaykum,</Text>
          <Text style={styles.userName}>{user?.name || 'Kitobxon'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Messages')} style={styles.headerIconBtn}>
            <MessageSquare size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn}>
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
        onPress={() => navigation.navigate('BookNew')}
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.xs,
    width: '47%',
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  bookImage: {
    height: 160,
    borderRadius: theme.roundness.sm,
    backgroundColor: theme.colors.background,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.roundness.xs,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.surface,
    overflow: 'hidden',
  },
  badge_rent: {
    backgroundColor: theme.colors.primary,
  },
  badge_free: {
    backgroundColor: theme.colors.success,
  },
  badge_sell: {
    backgroundColor: theme.colors.secondary,
  },
  bookInfo: {
    padding: theme.spacing.xs,
  },
  bookTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  bookAuthor: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bookPrice: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
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
