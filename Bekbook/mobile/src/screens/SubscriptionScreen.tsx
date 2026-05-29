import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Star, Zap, Crown, Check } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

const PLAN_META: Record<string, any> = {
  monthly:  { icon: Star,  borderColor: '#bfdbfe', bgColor: '#eff6ff', badgeBg: '#dbeafe', badgeText: '#1d4ed8' },
  biannual: { icon: Zap,   borderColor: '#fed7aa', bgColor: '#fff7ed', badgeBg: '#ffedd5', badgeText: '#c2410c' },
  annual:   { icon: Crown, borderColor: '#fde68a', bgColor: '#fffbeb', badgeBg: '#fef3c7', badgeText: '#b45309' },
};

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const storeId = route.params?.storeId;

  const [plans, setPlans] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansData, subData] = await Promise.all([
        apiService.getSubscriptionPlans(),
        apiService.getUserStoreSubscription(storeId)
      ]);
      setPlans(plansData.plans || []);
      setIsActive(subData.active || false);
    } catch (error) {
      console.log('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (planKey: string) => {
    setSubscribing(planKey);
    try {
      const data = await apiService.createSubscription(storeId, planKey);
      if (data.checkoutUrl) {
        Linking.openURL(data.checkoutUrl);
      }
    } catch (error: any) {
      Alert.alert('Xatolik', error?.response?.data?.error || 'Tarmoq xatosi');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isActive && (
          <View style={styles.activeCard}>
            <Check size={24} color="#0f766e" />
            <View style={styles.activeInfo}>
              <Text style={styles.activeTitle}>Abonement faol!</Text>
              <Text style={styles.activeDesc}>Siz ushbu kutubxonadan cheksiz kitob ijaraga olishingiz mumkin</Text>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan: any) => {
              const meta = PLAN_META[plan.key] || PLAN_META.monthly;
              const Icon = meta.icon;

              return (
                <View key={plan.key} style={[styles.planCard, { borderColor: meta.borderColor, backgroundColor: meta.bgColor }]}>
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleRow}>
                      <View style={styles.iconBox}>
                        <Icon size={20} color={theme.colors.text} />
                      </View>
                      <View>
                        <Text style={styles.planName}>{plan.label}</Text>
                        <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
                          <Text style={[styles.badgeText, { color: meta.badgeText }]}>{plan.days} kun</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.planPrice}>{(plan.price / 100).toLocaleString()} so'm</Text>
                  </View>

                  <View style={styles.features}>
                    {["Cheksiz ijara", "Navbatsiz olish", "Ustuvor xizmat"].map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <Check size={16} color="#0f766e" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={[styles.payBtn, (isActive || subscribing === plan.key) && styles.payBtnDisabled]}
                    onPress={() => handleSubscribe(plan.key)}
                    disabled={isActive || !!subscribing}
                  >
                    {subscribing === plan.key ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.payBtnText}>
                        {isActive ? 'Faol abonement bor' : 'Payme orqali to\'lash'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footerText}>
          To'lov Payme orqali xavfsiz amalga oshiriladi
        </Text>
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
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 4,
  },
  activeDesc: {
    fontSize: 13,
    color: '#0f766e',
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  features: {
    gap: 8,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  payBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
