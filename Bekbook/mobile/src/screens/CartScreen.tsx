import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ShoppingCart, Trash2, MapPin, Truck, Package } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';
import { useCart } from '../store/cartStore';

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const { items, remove, clear } = useCart();

  const [loading, setLoading] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const total = items.reduce((s, i) => s + i.price, 0);

  const handleCheckout = async (bookId: number, price: number) => {
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      Alert.alert('Xatolik', 'Manzilni kiriting');
      return;
    }

    setLoading(bookId);
    try {
      const data = await apiService.createPayment({
        bookId,
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : undefined,
      });
      if (data.checkoutUrl) {
        Linking.openURL(data.checkoutUrl);
      }
    } catch (error: any) {
      Alert.alert('Xatolik', error?.response?.data?.error || 'To\'lov xatosi');
    } finally {
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Savat</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ShoppingCart size={64} color={theme.colors.borderWarm} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Savat bo'sh</Text>
          <Text style={styles.emptySubtitle}>Kitob sahifasida "Savatga" tugmasini bosing</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseButtonText}>Kitoblarni ko'rish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Savat ({items.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Delivery Type */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Yetkazib berish turi</Text>
          <View style={styles.deliveryTabs}>
            <TouchableOpacity 
              style={[styles.deliveryTab, deliveryType === 'pickup' && styles.deliveryTabActive]}
              onPress={() => setDeliveryType('pickup')}
            >
              <Package size={20} color={deliveryType === 'pickup' ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[styles.deliveryTabText, deliveryType === 'pickup' && styles.deliveryTabTextActive]}>
                O'zim olam
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.deliveryTab, deliveryType === 'delivery' && styles.deliveryTabActive]}
              onPress={() => setDeliveryType('delivery')}
            >
              <Truck size={20} color={deliveryType === 'delivery' ? theme.colors.primary : theme.colors.textMuted} />
              <Text style={[styles.deliveryTabText, deliveryType === 'delivery' && styles.deliveryTabTextActive]}>
                Dostavka
              </Text>
            </TouchableOpacity>
          </View>

          {deliveryType === 'delivery' && (
            <View style={styles.addressInputContainer}>
              <MapPin size={20} color={theme.colors.textMuted} />
              <TextInput 
                style={styles.addressInput}
                placeholder="Toshkent, Chilonzor 5-kvartal..."
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {items.map(item => (
            <View key={item.bookId} style={styles.itemCard}>
              {item.image ? (
                <Image 
                  source={{ uri: item.image.startsWith('http') ? item.image : `https://bekbook.alif24.uz/api${item.image}` }}
                  style={styles.itemImage}
                />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <ShoppingCart size={24} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                {item.author && <Text style={styles.itemAuthor} numberOfLines={1}>{item.author}</Text>}
                <Text style={styles.itemPrice}>{item.price.toLocaleString()} so'm</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item.bookId)}>
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.checkoutBtn, loading === item.bookId && styles.checkoutBtnDisabled]}
                  onPress={() => handleCheckout(item.bookId, item.price)}
                  disabled={loading === item.bookId}
                >
                  {loading === item.bookId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.checkoutBtnText}>To'lash</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Jami ({items.length} kitob)</Text>
            <Text style={styles.summaryValue}>{total.toLocaleString()} so'm</Text>
          </View>
          {deliveryType === 'delivery' && (
            <Text style={styles.summaryDelivery}>+ Yetkazib berish narxi kelishiladi</Text>
          )}
          <TouchableOpacity style={styles.clearBtn} onPress={clear}>
            <Text style={styles.clearBtnText}>Savatni tozalash</Text>
          </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  deliveryTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  deliveryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.background,
  },
  deliveryTabActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(15,118,110,0.05)',
  },
  deliveryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  deliveryTabTextActive: {
    color: theme.colors.primary,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
  },
  addressInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  itemsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  itemImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  itemAuthor: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 4,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
  },
  removeBtn: {
    padding: 4,
  },
  checkoutBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryDelivery: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  clearBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    color: '#ef4444',
  },
});
