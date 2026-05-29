import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Shield, Users, BookOpen, Clock, BarChart2 } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';
import * as SecureStore from 'expo-secure-store';

export default function AdminScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('mahalla_token');
      const res = await fetch('https://bekbook.alif24.uz/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: any, color: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Icon size={24} color={color.replace('0.1)', '1)').replace(', 0.1)', ', 1)') || theme.colors.primary} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value ?? 0}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <BarChart2 size={16} color={activeTab === 'stats' ? '#fff' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Statistika</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Users size={16} color={activeTab === 'users' ? '#fff' : theme.colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Foydalanuvchilar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'stats' && (
          loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : stats ? (
            <View style={styles.statsGrid}>
              <StatCard icon={Users} label="Foydalanuvchilar" value={stats.users} color="#dbeafe" />
              <StatCard icon={BookOpen} label="Jami kitoblar" value={stats.books} color="#fef3c7" />
              <StatCard icon={Clock} label="Tranzaksiyalar" value={stats.transactions} color="#ede9fe" />
              <StatCard icon={Shield} label="Aktiv obunalar" value={stats.activeSubscriptions} color="#ccfbf1" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Statistika yuklanmadi</Text>
            </View>
          )
        )}
        
        {activeTab === 'users' && (
          <View style={styles.emptyContainer}>
            <Users size={48} color={theme.colors.borderWarm} />
            <Text style={styles.emptyText}>Tez orada: Foydalanuvchilarni boshqarish</Text>
          </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
});
