import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, FileText, PackagePlus, PackageMinus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function InvoicesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const storeId = route.params?.storeId;

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getStoreInvoices(storeId);
      setInvoices(data.invoices || []);
    } catch (error) {
      console.log('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const renderInvoiceItem = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;
    const isKirim = item.type === 'kirim';
    const Icon = isKirim ? PackagePlus : PackageMinus;
    
    const totalQty = item.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
    const totalSum = item.items?.reduce((acc: number, curr: any) => acc + (curr.quantity * curr.unitPrice), 0) || 0;

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, isKirim ? styles.kirimBg : styles.chiqimBg]}>
            <Icon size={20} color={isKirim ? '#0f766e' : '#be123c'} />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.rowBetween}>
              <Text style={styles.invoiceNumber}>№ {item.number}</Text>
              <View style={[styles.badge, isKirim ? styles.kirimBadge : styles.chiqimBadge]}>
                <Text style={[styles.badgeText, isKirim ? styles.kirimText : styles.chiqimText]}>
                  {isKirim ? 'Kirim' : 'Chiqim'}
                </Text>
              </View>
            </View>
            <Text style={styles.dateText}>{item.date} {item.supplier ? `· ${item.supplier}` : ''}</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>{totalQty} ta kitob</Text>
              {totalSum > 0 && <Text style={styles.statsText}>{totalSum.toLocaleString()} so'm</Text>}
            </View>
          </View>
          {isExpanded ? <ChevronUp size={20} color={theme.colors.textMuted} /> : <ChevronDown size={20} color={theme.colors.textMuted} />}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
            {item.items?.map((product: any, index: number) => (
              <View key={index} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  {product.author && <Text style={styles.productAuthor}>{product.author}</Text>}
                </View>
                <View style={styles.productPrice}>
                  <Text style={styles.productQty}>{product.quantity} ta</Text>
                  {product.unitPrice > 0 && (
                    <Text style={styles.productSum}>{(product.quantity * product.unitPrice).toLocaleString()} so'm</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nakladnoylar</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : invoices.length > 0 ? (
        <FlatList
          data={invoices}
          keyExtractor={item => item.id.toString()}
          renderItem={renderInvoiceItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <FileText size={48} color={theme.colors.borderWarm} />
          <Text style={styles.emptyText}>Nakladnoylar topilmadi</Text>
        </View>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kirimBg: {
    backgroundColor: '#ccfbf1',
  },
  chiqimBg: {
    backgroundColor: '#ffe4e6',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  kirimBadge: {
    backgroundColor: '#ccfbf1',
    borderColor: '#99f6e4',
  },
  chiqimBadge: {
    backgroundColor: '#ffe4e6',
    borderColor: '#fecdd3',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kirimText: {
    color: '#0f766e',
  },
  chiqimText: {
    color: '#be123c',
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  statsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.background,
  },
  notesText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  productAuthor: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  productQty: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  productSum: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
