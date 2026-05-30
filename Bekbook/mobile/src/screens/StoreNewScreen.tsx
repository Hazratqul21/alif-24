import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Store as StoreIcon, BookOpen, Save, Search, MapPin } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function StoreNewScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'book_library' | 'book_market'>('book_library');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openHours, setOpenHours] = useState('');
  const [inn, setInn] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState('29900');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [innLoading, setInnLoading] = useState(false);

  const fetchInnData = async () => {
    if (inn.length !== 9) {
      Alert.alert('Xato', 'STIR/INN 9 xonali son bo\'lishi kerak');
      return;
    }
    setInnLoading(true);
    // Simulate API call to Soliq.uz or Orginfo
    setTimeout(() => {
      setInnLoading(false);
      setName("ALIF 24 KITOB DO'KONI MCHJ");
      setAddress("Toshkent shahri, Yunusobod tumani, 4-mavze");
      setPhone("+998 90 123 45 67");
      Alert.alert('Muvaffaqiyatli', 'Tashkilot ma\'lumotlari davlat reestridan yuklandi!');
    }, 1500);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !inn.trim() || lat === null || lng === null) {
      Alert.alert('Xatolik', "Nomi, manzili, INN va xaritadan joyni belgilash majburiy");
      return;
    }

    setLoading(true);
    try {
      const data = {
        name,
        description,
        address,
        phone,
        openHours,
        inn,
        lat,
        lng,
        type,
        subscriptionPrice: type === 'book_library' ? parseInt(subscriptionPrice) : 0,
      };
      
      const newStore = await apiService.createStore(data);
      Alert.alert('Arizangiz qabul qilindi', 'Kutubxonangiz ro\'yxatga olindi. Admindan ruxsat kutilmoqda. Tasdiqlangandan so\'ng kitob qo\'shishingiz mumkin bo\'ladi.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.log('Error creating store:', error);
      Alert.alert('Xatolik', error?.response?.data?.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kutubxona qo'shish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionLabel}>Yuridik shaxs STIR/INN (Majburiy) *</Text>
        <View style={styles.innRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="9 xonali INN kiriting..."
            value={inn}
            onChangeText={setInn}
            keyboardType="number-pad"
            maxLength={9}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity 
            style={styles.innSearchBtn} 
            onPress={fetchInnData}
            disabled={innLoading}
          >
            {innLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Search size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.innHintText}>
          INN kiritish orqali tashkilot ma'lumotlarini (nomi, manzili) davlat bazasidan avtomatik tortib olishingiz mumkin.
        </Text>

        <Text style={styles.sectionLabel}>Turi *</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'book_library' && styles.typeButtonActive]}
            onPress={() => setType('book_library')}
          >
            <BookOpen size={20} color={type === 'book_library' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.typeText, type === 'book_library' && styles.typeTextActive]}>Kutubxona</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'book_market' && styles.typeButtonActive]}
            onPress={() => setType('book_market')}
          >
            <StoreIcon size={20} color={type === 'book_market' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.typeText, type === 'book_market' && styles.typeTextActive]}>Do'kon</Text>
          </TouchableOpacity>
        </View>

        {type === 'book_library' && (
          <View>
            <Text style={styles.sectionLabel}>Oylik obuna narxi (so'm)</Text>
            <TextInput
              style={styles.input}
              placeholder="29900"
              value={subscriptionPrice}
              onChangeText={setSubscriptionPrice}
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        )}

        <Text style={styles.sectionLabel}>Nomi *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nomi"
          value={name}
          onChangeText={setName}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Tavsif</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tavsif"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Manzil *</Text>
        <TextInput
          style={styles.input}
          placeholder="Manzil"
          value={address}
          onChangeText={setAddress}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Joylashuv xaritada *</Text>
        <TouchableOpacity 
          style={[styles.mapButton, lat !== null && styles.mapButtonActive]} 
          onPress={() => navigation.navigate('MapPicker', {
            initialLat: lat,
            initialLng: lng,
            onSelect: (coords: { lat: number, lng: number }) => {
              setLat(coords.lat);
              setLng(coords.lng);
            }
          })}
        >
          <MapPin size={20} color={lat !== null ? theme.colors.primary : theme.colors.textMuted} />
          <Text style={[styles.mapButtonText, lat !== null && styles.mapButtonTextActive]}>
            {lat !== null && lng !== null ? `Belgilangan: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Xaritadan joyni belgilash"}
          </Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              placeholder="+998..."
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Ish vaqti</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00 - 18:00"
              value={openHours}
              onChangeText={setOpenHours}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Saqlash</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.surface,
  },
  typeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FEF3C7', // primary light
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  typeTextActive: {
    color: theme.colors.primary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.surface,
  },
  mapButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FEF3C7',
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  mapButtonTextActive: {
    color: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: 50,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderWarm,
  },
  saveButton: {
    
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  innRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  innSearchBtn: {
    backgroundColor: theme.colors.primary,
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innHintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
});
