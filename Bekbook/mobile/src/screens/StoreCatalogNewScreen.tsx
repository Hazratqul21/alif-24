import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, BookOpen, Save, Scan } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';

export default function StoreCatalogNewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const storeId = route.params?.storeId;

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<'sell' | 'rent'>('rent');
  const [price, setPrice] = useState('');
  const [rentDuration, setRentDuration] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Xatolik', 'Kitob nomi kiritilishi shart');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title,
        author,
        type,
        price: type === 'sell' ? parseInt(price) : null,
        rentDuration: type === 'rent' ? parseInt(rentDuration) : null,
        stock: parseInt(stock),
        description,
        status: 'available'
      };
      
      await apiService.createStoreBook(storeId, data);
      Alert.alert('Muvaffaqiyatli', 'Kitob do\'kon katalogiga qo\'shildi', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.log('Error creating store book:', error);
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
        <Text style={styles.headerTitle}>Katalogga kitob qo'shish</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Scan')}>
          <Scan size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Kitob nomi *</Text>
        <TextInput
          style={styles.input}
          placeholder="Asrga tatigulik kun..."
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Muallif</Text>
        <TextInput
          style={styles.input}
          placeholder="Chingiz Aytmatov..."
          value={author}
          onChangeText={setAuthor}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Holati *</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'rent' && styles.typeButtonActive]}
            onPress={() => setType('rent')}
          >
            <Text style={[styles.typeText, type === 'rent' && styles.typeTextActive]}>Ijaraga (Vaqtincha)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'sell' && styles.typeButtonActive]}
            onPress={() => setType('sell')}
          >
            <Text style={[styles.typeText, type === 'sell' && styles.typeTextActive]}>Sotish</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {type === 'rent' ? (
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Ijara muddati (kun)</Text>
              <TextInput
                style={styles.input}
                placeholder="Masalan: 14"
                value={rentDuration}
                onChangeText={setRentDuration}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          ) : (
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Narxi (so'm)</Text>
              <TextInput
                style={styles.input}
                placeholder="Masalan: 45000"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          )}
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Soni (nusxa)</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Tavsif</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Kitob haqida qisqacha ma'lumot..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={theme.colors.textMuted}
        />

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Katalogga qo'shish</Text>
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
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.surface,
  },
  typeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FEF3C7',
  },
  typeText: {
    fontSize: 14,
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
