import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Store, CheckCircle, CreditCard, Calendar } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function StoreOwnerPayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const storeId = route.params?.storeId;

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getStoreOwnerStatus(storeId);
      setStatus(data);
    } catch (error) {
      console.log('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePay = async () => {
    setPaying(true);
    try {
      const data = await apiService.activateStore(storeId);
      setPaid(true);
      setStatus((prev: any) => ({ ...prev, isActive: true, subscription: data.subscription }));
    } catch (error: any) {
      Alert.alert('Xatolik', error?.response?.data?.message || 'To\'lovda xatolik yuz berdi');
    } finally {
      setPaying(false);
    }
  };

  const expiresDate = status?.subscription?.expiresAt
    ? new Date(status.subscription.expiresAt).toLocaleDateString('ru-RU')
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kutubxona obunasi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {(paid || status?.isActive) ? (
              <View style={styles.successCard}>
                <View style={styles.successHeader}>
                  <CheckCircle size={24} color="#0f766e" />
                  <Text style={styles.successTitle}>Obuna faol!</Text>
                </View>
                <Text style={styles.successText}>Kutubxonangiz muvaffaqiyatli faollashtirildi.</Text>
                {expiresDate && (
                  <View style={styles.dateRow}>
                    <Calendar size={16} color="#0f766e" />
                    <Text style={styles.dateText}>Muddati: {expiresDate}</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('StoreDetail', { storeId })}
                >
                  <Text style={styles.actionBtnText}>Kutubxonaga o'tish</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.payCard}>
                <View style={styles.payHeader}>
                  <View style={styles.iconBg}>
                    <Store size={28} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.payTitle}>Oylik obuna</Text>
                    <Text style={styles.payPrice}>
                      {(status?.price ?? 200000).toLocaleString()} so'm
                    </Text>
                  </View>
                </View>

                <View style={styles.featuresList}>
                  {[
                    "Kutubxonangiz platformada ko'rinadi",
                    "Cheksiz kitob katalogi",
                    "Ijara va tranzaksiya boshqaruvi",
                    "QR kod va inventarizatsiya",
                    "30 kun davomida faol",
                  ].map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <CheckCircle size={18} color="#14b8a6" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    To'lovdan so'ng kutubxonangiz 30 kun davomida faol bo'ladi.
                    Har oy yangilash kerak.
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.payBtn}
                  onPress={handlePay}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CreditCard size={20} color="#fff" />
                      <Text style={styles.payBtnText}>
                        {(status?.price ?? 200000).toLocaleString()} so'm to'lash
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
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
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 16,
    padding: 20,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f766e',
  },
  successText: {
    fontSize: 14,
    color: '#0f766e',
    marginLeft: 32,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 32,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 13,
    color: '#0f766e',
  },
  actionBtn: {
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  payCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: 16,
    padding: 20,
  },
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  iconBg: {
    width: 56,
    height: 56,
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  payPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  infoBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  payBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
