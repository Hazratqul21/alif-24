import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { ArrowLeft, BookOpen, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import apiService from '../services/api';

export default function AnalyticsScreen({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // In a real app we would call: apiService.getAnalyticsOverview()
    // Mocking for now to avoid crashes if endpoint doesn't exist
    setTimeout(() => {
      setData({
        total: 145,
        active: 32,
        overdue: 5,
        returned: 108,
        totalFineCollected: 15000,
        totalFineExpected: 45000,
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistika</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Umumiy ko'rsatkichlar</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderColor: theme.colors.primary }]}>
              <BookOpen size={24} color={theme.colors.primary} />
              <Text style={styles.statValue}>{data.total}</Text>
              <Text style={styles.statLabel}>Jami berilgan</Text>
            </View>
            <View style={[styles.statCard, { borderColor: theme.colors.info }]}>
              <Clock size={24} color={theme.colors.info} />
              <Text style={styles.statValue}>{data.active}</Text>
              <Text style={styles.statLabel}>Aktiv ijaralar</Text>
            </View>
            <View style={[styles.statCard, { borderColor: theme.colors.danger }]}>
              <AlertTriangle size={24} color={theme.colors.danger} />
              <Text style={styles.statValue}>{data.overdue}</Text>
              <Text style={styles.statLabel}>Muddati o'tgan</Text>
            </View>
            <View style={[styles.statCard, { borderColor: theme.colors.success }]}>
              <CheckCircle size={24} color={theme.colors.success} />
              <Text style={styles.statValue}>{data.returned}</Text>
              <Text style={styles.statLabel}>Qaytarilgan</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Jarima hisobi</Text>
          <View style={styles.financeCard}>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Yig'ilgan jarima:</Text>
              <Text style={[styles.financeValue, { color: theme.colors.success }]}>
                {data.totalFineCollected.toLocaleString()} so'm
              </Text>
            </View>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Kutilayotgan jarima:</Text>
              <Text style={[styles.financeValue, { color: theme.colors.danger }]}>
                {data.totalFineExpected.toLocaleString()} so'm
              </Text>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  backBtn: { padding: theme.spacing.xs },
  headerTitle: { fontSize: theme.typography.sizes.lg, fontWeight: '700', color: theme.colors.text },
  loader: { marginTop: 40 },
  scrollContent: { padding: theme.spacing.md },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  financeCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.roundness.md,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  financeLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  financeValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '800',
  },
});
