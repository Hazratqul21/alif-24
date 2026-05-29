import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { theme } from '../theme/theme';
import apiService, { Transaction, Book } from '../services/api';
import { User, LogOut, Award, RefreshCw, CheckCircle, Clock } from 'lucide-react-native';

export default function ProfileScreen({ navigation, user, onLogout }: { navigation: any; user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'lends' | 'favorites'>('lends');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'lends') {
        const data = await apiService.getTransactions();
        setTransactions(data);
      } else {
        // Fallback mockup or real call depending on endpoint
        const data = await apiService.getFavorites();
        setFavorites(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [activeTab]);

  const handleReturn = async (transactionId: number) => {
    Alert.alert(
      'Kitobni qaytarish',
      'Ushbu kitob muvaffaqiyatli qaytarildimi?',
      [
        { text: 'Yo\'q', style: 'cancel' },
        {
          text: 'Ha',
          onPress: async () => {
            try {
              const res = await apiService.returnBook(transactionId);
              Alert.alert(
                'Muvaffaqiyatli',
                res.fineAmount > 0
                  ? `Kitob qaytarildi. Jarima: ${res.fineAmount.toLocaleString()} so'm`
                  : 'Kitob muvaffaqiyatli qaytarildi!'
              );
              fetchProfileData();
            } catch (err) {
              Alert.alert('Xatolik', 'Amalni bajarishda xatolik yuz berdi');
            }
          }
        }
      ]
    );
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isOverdue = item.status === 'overdue';
    const isActive = item.status === 'active';

    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <Text style={styles.logBookTitle} numberOfLines={1}>{item.book?.title || 'Kitob'}</Text>
          <Text style={[
            styles.statusBadge,
            isOverdue ? styles.badgeOverdue : isActive ? styles.badgeActive : styles.badgeReturned
          ]}>
            {isOverdue ? 'Muddati o\'tgan' : isActive ? 'Faol' : 'Qaytarilgan'}
          </Text>
        </View>

        <View style={styles.logInfoRow}>
          <Text style={styles.logLabel}>Oluvchi:</Text>
          <Text style={styles.logValue}>{item.borrowerName}</Text>
        </View>

        <View style={styles.logInfoRow}>
          <Text style={styles.logLabel}>Muddati:</Text>
          <Text style={styles.logValue}>{apiService.formatDateShort(item.dueDate)}</Text>
        </View>

        {item.fineAmount ? (
          <View style={styles.logInfoRow}>
            <Text style={styles.logLabel}>Jarima:</Text>
            <Text style={[styles.logValue, { color: theme.colors.danger }]}>{item.fineAmount.toLocaleString()} so'm</Text>
          </View>
        ) : null}

        {isActive || isOverdue ? (
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => handleReturn(item.id)}
          >
            <CheckCircle size={16} color={theme.colors.surface} style={{ marginRight: 6 }} />
            <Text style={styles.returnBtnText}>Qaytarib Olish</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mening Profilim</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <LogOut size={20} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User Card info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBig}>
            <User size={48} color={theme.colors.secondary} />
          </View>
          <Text style={styles.profileName}>{user?.name || 'Foydalanuvchi'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>
          <Text style={styles.profilePhone}>{user?.phone || 'Telefon raqam yo\'q'}</Text>
        </View>

        {/* Digital Kitobxon ID (VIP Card presentation) */}
        <View style={styles.vipCard}>
          <View style={styles.vipHeader}>
            <Award size={24} color="#FFF" />
            <Text style={styles.vipHeaderText}>KUTUBXONACHI ID</Text>
          </View>
          <Text style={styles.vipNumber}>
            {user?.readerId ? user.readerId.replace(/(\d{4})/g, '$1 ').trim() : '8401 2931'}
          </Text>
          <View style={styles.vipFooter}>
            <Text style={styles.vipUser}>{user?.name?.toUpperCase() || 'ELBEK KHABIBULLAYEV'}</Text>
            <Text style={styles.vipLogo}>Bekbook</Text>
          </View>
        </View>

        {/* Tab row */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lends' && styles.tabActive]}
            onPress={() => setActiveTab('lends')}
          >
            <Text style={[styles.tabText, activeTab === 'lends' && styles.tabTextActive]}>
              Kitob tranzaksiyalari
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
              Sevimli kitoblar
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : activeTab === 'lends' ? (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Hech qanday kitob tranzaksiyalari mavjud emas.</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={favorites}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.favoriteCard}
                onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
              >
                <Text style={styles.favoriteTitle}>{item.title}</Text>
                <Text style={styles.favoriteAuthor}>{item.author}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sevimli kitoblar topilmadi.</Text>
              </View>
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  logoutBtn: {
    padding: theme.spacing.xs,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  avatarBig: {
    backgroundColor: theme.colors.primaryLight,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  profileName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  profileEmail: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  profilePhone: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  vipCard: {
    backgroundColor: '#3F2305',
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.md,
    height: 180,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  vipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vipHeaderText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    marginLeft: theme.spacing.sm,
    letterSpacing: 2,
  },
  vipNumber: {
    color: '#F9F5F6',
    fontSize: theme.typography.sizes.xl,
    letterSpacing: 4,
    fontWeight: theme.typography.weights.bold,
    fontFamily: 'System',
    marginVertical: theme.spacing.md,
  },
  vipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vipUser: {
    color: '#FFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  vipLogo: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 6,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.roundness.md,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  tab: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.roundness.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  tabTextActive: {
    color: theme.colors.surface,
  },
  listPadding: {
    padding: theme.spacing.md,
  },
  logCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  logBookTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.roundness.xs,
    overflow: 'hidden',
    color: '#fff',
  },
  badgeActive: {
    backgroundColor: theme.colors.info,
  },
  badgeOverdue: {
    backgroundColor: theme.colors.danger,
  },
  badgeReturned: {
    backgroundColor: theme.colors.success,
  },
  logInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
  logValue: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  returnBtn: {
    backgroundColor: theme.colors.success,
    height: 36,
    borderRadius: theme.roundness.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  returnBtnText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  favoriteCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  favoriteTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  favoriteAuthor: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
});
