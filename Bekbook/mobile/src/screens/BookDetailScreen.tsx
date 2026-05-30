import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  SafeAreaView
} from 'react-native';
import { theme } from '../theme/theme';
import apiService, { Book } from '../services/api';
import { Calendar, User, Phone, DollarSign, BookOpen, ChevronLeft, ShoppingCart } from 'lucide-react-native';
import { useCart } from '../store/cartStore';

export default function BookDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLendModalVisible, setIsLendModalVisible] = useState(false);
  const { items, add } = useCart();

  // Lend Form State
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [finePerDay, setFinePerDay] = useState('1000');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookDetails = async () => {
    try {
      const data = await apiService.getBook(bookId);
      setBook(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Xatolik', 'Kitob ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, [bookId]);

  const isInCart = book ? items.some(cartItem => cartItem.bookId === book.id) : false;

  const handleAddToCart = () => {
    if (!book) return;
    if (isInCart) {
      navigation.navigate('Cart');
    } else {
      add({
        bookId: book.id,
        title: book.title,
        author: book.author || 'Noma\'lum muallif',
        price: book.price || 0,
        image: book.image || (Array.isArray(book.images) ? book.images[0] : book.images) || null
      });
    }
  };

  const handleLendSubmit = async () => {
    if (!borrowerName || !borrowerPhone || !dueDate) {
      Alert.alert('Xatolik', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.createTransaction({
        bookId: book?.id,
        borrowerName,
        borrowerPhone,
        dueDate,
        finePerDay: parseFloat(finePerDay) || 0,
        notes,
      });
      Alert.alert('Muvaffaqiyatli', 'Kitob muvaffaqiyatli ijaraga berildi!');
      setIsLendModalVisible(false);
      fetchBookDetails();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Xatolik', error.response?.data?.message || 'Amalni bajarib bo\'lmadi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kitob topilmadi.</Text>
      </View>
    );
  }

  const imageUrl = apiService.getImageUrl(book.image || book.images);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{book.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Book cover and base details */}
        <View style={styles.coverSection}>
          <Image source={{ uri: imageUrl }} style={styles.coverImage} resizeMode="contain" />
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.badgeRow}>
            <Text style={[styles.typeBadge, styles[`badge_${book.type}` as keyof typeof styles]]}>
              {book.type === 'rent' ? 'Ijara' : book.type === 'free' ? 'Tekinga' : 'Sotish'}
            </Text>
            <Text style={[styles.statusBadge, book.status === 'available' ? styles.statusAvailable : styles.statusRented]}>
              {book.status === 'available' ? 'Mavjud' : 'Ijarada'}
            </Text>
          </View>

          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          <Text style={styles.price}>
            {book.type === 'free' ? 'Bepul' : `${book.price.toLocaleString()} so'm`}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.subTitle}>Kitob tavsifi</Text>
          <Text style={styles.description}>
            {book.description || "Ushbu kitob uchun tavsif yozilmagan."}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.subTitle}>Qo'shimcha ma'lumotlar</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Holati:</Text>
            <Text style={styles.infoValue}>{book.condition || 'Yaxshi'}</Text>
          </View>
          {book.genre && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Janri:</Text>
              <Text style={styles.infoValue}>{book.genre}</Text>
            </View>
          )}
          {book.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Manzil:</Text>
              <Text style={styles.infoValue}>{book.address}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Dynamic Action Button */}
      {book.status === 'available' && book.type === 'rent' && (
        <View style={styles.actionFooter}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setIsLendModalVisible(true)}>
            <BookOpen size={20} color={theme.colors.surface} style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Kitobni ijaraga berish</Text>
          </TouchableOpacity>
        </View>
      )}

      {book.status === 'available' && book.type === 'sell' && (
        <View style={styles.actionFooter}>
          <TouchableOpacity 
            style={[styles.actionBtn, isInCart && { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]} 
            onPress={handleAddToCart}
          >
            <ShoppingCart size={20} color={isInCart ? "#94A3B8" : theme.colors.surface} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, isInCart && { color: '#64748B' }]}>
              {isInCart ? 'Savatda (O\'tish)' : 'Savatga qo\'shish'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lend Modal BottomSheet representation */}
      <Modal
        visible={isLendModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLendModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kitob berish shakli</Text>
              <TouchableOpacity onPress={() => setIsLendModalVisible(false)}>
                <Text style={styles.closeModalText}>Yopish</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              <Text style={styles.formLabel}>Oluvchining ismi (Ism-Familiya) *</Text>
              <View style={styles.formInputContainer}>
                <User size={18} color={theme.colors.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Masalan: Elbek Xabibullayev"
                  value={borrowerName}
                  onChangeText={setBorrowerName}
                />
              </View>

              <Text style={styles.formLabel}>Oluvchining telefon raqami *</Text>
              <View style={styles.formInputContainer}>
                <Phone size={18} color={theme.colors.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Masalan: +998901234567"
                  value={borrowerPhone}
                  onChangeText={setBorrowerPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.formLabel}>Qaytarish sanasi (YYYY-MM-DD) *</Text>
              <View style={styles.formInputContainer}>
                <Calendar size={18} color={theme.colors.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Masalan: 2026-06-15"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>

              <Text style={styles.formLabel}>Kunlik jarima miqdori (so'mda)</Text>
              <View style={styles.formInputContainer}>
                <DollarSign size={18} color={theme.colors.textMuted} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formInput}
                  placeholder="Masalan: 1000"
                  value={finePerDay}
                  onChangeText={setFinePerDay}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.formLabel}>Qaydlar</Text>
              <View style={[styles.formInputContainer, { height: 80, alignItems: 'flex-start' }]}>
                <TextInput
                  style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Qo'shimcha ma'lumotlar yoki kitob holati..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline={true}
                />
              </View>

              <TouchableOpacity
                style={styles.submitLendBtn}
                onPress={handleLendSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.submitLendBtnText}>Tasdiqlash va Berish</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    height: 70,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  backBtn: {
    paddingTop: 40,
    padding: theme.spacing.xs,
  },
  navTitle: {
    paddingTop: 40,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.md,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  coverSection: {
    backgroundColor: theme.colors.surface,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
    padding: theme.spacing.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.xl,
    borderTopRightRadius: theme.roundness.xl,
    padding: theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    minHeight: 400,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.roundness.xs,
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.surface,
    marginRight: theme.spacing.sm,
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
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.roundness.xs,
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.surface,
    overflow: 'hidden',
  },
  statusAvailable: {
    backgroundColor: '#34D399',
  },
  statusRented: {
    backgroundColor: '#94A3B8',
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  author: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  price: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.secondary,
    marginTop: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderWarm,
    marginVertical: theme.spacing.lg,
  },
  subTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  actionFooter: {
    paddingBottom:40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderWarm,
    padding: theme.spacing.md,
  },
  actionBtn: {
    
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionBtnText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.xl,
    borderTopRightRadius: theme.roundness.xl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  closeModalText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  modalFormScroll: {
    paddingBottom: theme.spacing.xl,
  },
  formLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  formInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: theme.roundness.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    height: 44,
  },
  formInputIcon: {
    marginRight: theme.spacing.sm,
  },
  formInput: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
  },
  submitLendBtn: {
    backgroundColor: theme.colors.secondary,
    height: 48,
    borderRadius: theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  submitLendBtnText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
});
