import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Store as StoreIcon, BookOpen, Save } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function StoreNewScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'library' | 'bookstore'>('library');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openHours, setOpenHours] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Xatolik', 'Nomi va manzilini kiritish shart');
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
        // type could be added to backend
      };
      
      const newStore = await apiService.createStore(data);
      Alert.alert('Muvaffaqiyatli', 'Kutubxona yaratildi', [
        { text: 'OK', onPress: () => navigation.navigate('StoreDetail', { storeId: newStore.id }) }
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
        <Text style={styles.sectionLabel}>Turi *</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'library' && styles.typeButtonActive]}
            onPress={() => setType('library')}
          >
            <BookOpen size={20} color={type === 'library' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.typeText, type === 'library' && styles.typeTextActive]}>Kutubxona</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'bookstore' && styles.typeButtonActive]}
            onPress={() => setType('bookstore')}
          >
            <StoreIcon size={20} color={type === 'bookstore' ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.typeText, type === 'bookstore' && styles.typeTextActive]}>Do'kon</Text>
          </TouchableOpacity>
        </View>

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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  footer: {
    padding: 16,
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
});
