import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ImagePlus, MapPin, X, Clock, CreditCard, CheckCircle } from 'lucide-react-native';
import { theme } from '../theme/theme';
import apiService, { User } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

interface BookNewScreenProps {
  navigation: any;
  user?: User | null;
}

const TYPES = [
  { value: "sell", label: "Sotiladi", desc: "Narxini belgilang" },
  { value: "free", label: "Bepul", desc: "Tekin berasiz" },
  { value: "rent", label: "Vaqtincha", desc: "Muddatli berasiz" },
];

const GENRES = [
  "Badiiy adabiyot", "Jahon adabiyoti", "Diniy adabiyot", 
  "Biznes va psixologiya", "Bolalar adabiyoti", "Ilmiy-ommabop"
];

const MAX_IMAGES = 2;

export default function BookNewScreen({ navigation, user }: BookNewScreenProps) {
  
  const [form, setForm] = useState({
    title: "", author: "", description: "", type: "sell",
    price: "", address: "", lat: "", lng: "", rentDuration: "", genre: "",
  });

  const [images, setImages] = useState<{ uri: string, mimeType: string, fileName: string }[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [quota, setQuota] = useState<any>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [feeToken, setFeeToken] = useState<string | null>(null);
  const [payStep, setPayStep] = useState<"idle" | "confirming" | "paid">("idle");

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      setQuotaLoading(true);
      const data = await apiService.getListingQuota();
      setQuota(data);
    } catch (error) {
      console.log('Error fetching quota:', error);
    } finally {
      setQuotaLoading(false);
    }
  };

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) return;
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImages([...images, {
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || `image-${Date.now()}.jpg`,
      }]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ruxsat yo\'q', 'Joylashuvga ruxsat berilmadi');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setForm({ ...form, lat: String(location.coords.latitude), lng: String(location.coords.longitude) });
    } catch (error) {
      console.log('Error getting location:', error);
      Alert.alert('Xatolik', 'Joylashuvni aniqlab bo\'lmadi');
    } finally {
      setGettingLocation(false);
    }
  };

  const initiatePayment = async () => {
    setPayStep("confirming");
    try {
      const data = await apiService.initiateBookListingPayment();
      setFeeToken(data.token);
      setPayStep("idle");
    } catch (error: any) {
      Alert.alert('Xatolik', error?.response?.data?.error || 'Xatolik');
      setPayStep("idle");
    }
  };

  const confirmPayment = async () => {
    if (!feeToken) return;
    setPayStep("confirming");
    try {
      await apiService.confirmBookListingPayment(feeToken);
      setPayStep("paid");
    } catch (error: any) {
      Alert.alert('Xatolik', error?.response?.data?.error || 'Xatolik');
      setPayStep("idle");
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.genre.trim()) {
      Alert.alert('Xatolik', 'Majburiy maydonlarni to\'ldiring');
      return;
    }

    if (quota?.requiresPayment && payStep !== "paid") {
      setShowPayModal(true);
      if (!feeToken) await initiatePayment();
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload images
      const uploadedUrls = [];
      for (const img of images) {
        const url = await apiService.uploadImage(img.uri, img.mimeType, img.fileName);
        uploadedUrls.push(url);
      }

      // 2. Create book
      const data = {
        title: form.title,
        author: form.author || undefined,
        description: form.description || undefined,
        type: form.type,
        price: form.type === "sell" && form.price ? parseFloat(form.price) : undefined,
        rentDuration: form.type === "rent" && form.rentDuration ? parseInt(form.rentDuration) : undefined,
        image: uploadedUrls[0] || undefined,
        image2: uploadedUrls[1] || undefined,
        address: form.address || undefined,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
        genre: form.genre || undefined,
        ...(feeToken && payStep === "paid" ? { feeToken } : {}),
      };

      await apiService.createBook(data);
      Alert.alert('Muvaffaqiyat', 'Kitob e\'lon qilindi!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Xatolik', error?.response?.data?.message || 'Kitob qo\'shishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const closePayModal = () => {
    setShowPayModal(false);
    if (payStep !== "paid") {
      setFeeToken(null);
      setPayStep("idle");
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yangi e'lon</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Tizimga Kiring</Text>
          <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginBottom: 24 }}>
            Yangi kitob e'lonini joylash uchun avval hisobingizga kirishingiz kerak.
          </Text>
          <TouchableOpacity 
            style={[styles.submitBtn, { width: '100%' }]} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.submitBtnText}>Kirish / Ro'yxatdan o'tish</Text>
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
        <Text style={styles.headerTitle}>E'lon berish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {quota && !quotaLoading && (
          <View style={[styles.quotaBanner, quota.requiresPayment ? styles.quotaBannerWarning : styles.quotaBannerSuccess]}>
            <Text style={[styles.quotaText, quota.requiresPayment ? styles.quotaTextWarning : styles.quotaTextSuccess]}>
              {quota.requiresPayment 
                ? `Bepul kvota tugadi — bu oy ${quota.monthlyCount} ta e'lon berdingiz (${quota.freeQuota} ta bepul). Keyingi e'lon uchun ${quota.feeAmount.toLocaleString()} so'm to'lov kerak.`
                : `Bu oy ${quota.monthlyCount}/${quota.freeQuota} ta bepul e'lon ishlatdingiz. ${quota.freeQuota - quota.monthlyCount} ta qoldi.`}
            </Text>
          </View>
        )}

        <View style={styles.formCard}>
          {/* Images */}
          <Text style={styles.label}>Rasmlar (2 tagacha)</Text>
          <View style={styles.imagesContainer}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imageSlot}>
                <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <ImagePlus size={24} color={theme.colors.textMuted} />
                <Text style={styles.addImageText}>Rasm qo'shish</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Fields */}
          <Text style={styles.label}>Kitob nomi *</Text>
          <TextInput 
            style={styles.input}
            value={form.title}
            onChangeText={t => setForm({ ...form, title: t })}
            placeholder="Masalan: Harry Potter"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.label}>Muallif</Text>
          <TextInput 
            style={styles.input}
            value={form.author}
            onChangeText={t => setForm({ ...form, author: t })}
            placeholder="Masalan: J.K. Rowling"
            placeholderTextColor={theme.colors.textMuted}
          />

          {/* Genre Selection - Simple buttons for mobile instead of select */}
          <Text style={styles.label}>Kitob janri *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
            {GENRES.map(g => (
              <TouchableOpacity 
                key={g} 
                style={[styles.genreBtn, form.genre === g && styles.genreBtnActive]}
                onPress={() => setForm({ ...form, genre: g })}
              >
                <Text style={[styles.genreText, form.genre === g && styles.genreTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Type */}
          <Text style={styles.label}>Tur *</Text>
          <View style={styles.typesContainer}>
            {TYPES.map(t => (
              <TouchableOpacity 
                key={t.value}
                style={[styles.typeBtn, form.type === t.value && styles.typeBtnActive]}
                onPress={() => setForm({ ...form, type: t.value })}
              >
                <Text style={[styles.typeTitle, form.type === t.value && styles.typeTitleActive]}>{t.label}</Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rent Duration */}
          {form.type === "rent" && (
            <View>
              <Text style={styles.label}>Ijara muddati (kun)</Text>
              <TextInput 
                style={styles.input}
                value={form.rentDuration}
                onChangeText={t => setForm({ ...form, rentDuration: t })}
                placeholder="Masalan: 7"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={styles.quickDaysRow}>
                {[7, 14, 30].map(d => (
                  <TouchableOpacity 
                    key={d}
                    style={[styles.quickDayBtn, form.rentDuration === String(d) && styles.quickDayBtnActive]}
                    onPress={() => setForm({ ...form, rentDuration: String(d) })}
                  >
                    <Text style={[styles.quickDayText, form.rentDuration === String(d) && styles.quickDayTextActive]}>{d} kun</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Price */}
          {form.type === "sell" && (
            <View>
              <Text style={styles.label}>Narxi (so'm)</Text>
              <TextInput 
                style={styles.input}
                value={form.price}
                onChangeText={t => setForm({ ...form, price: t })}
                placeholder="Masalan: 50000"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          )}

          <Text style={styles.label}>Tavsif</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={t => setForm({ ...form, description: t })}
            placeholder="Kitob haqida qisqacha..."
            multiline
            numberOfLines={3}
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.label}>Manzil</Text>
          <View style={styles.locationRow}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={form.address}
              onChangeText={t => setForm({ ...form, address: t })}
              placeholder="Ko'cha, mahalla..."
              placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity 
              style={[styles.gpsBtn, form.lat ? styles.gpsBtnActive : null]}
              onPress={getLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <MapPin size={20} color={form.lat ? theme.colors.primary : theme.colors.textMuted} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {quota?.requiresPayment && payStep !== "paid" ? "To'lov qilib e'lon berish" : "E'lon berish"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>E'lon uchun to'lov</Text>
            
            {payStep === "paid" ? (
              <View style={styles.modalSuccess}>
                <CheckCircle size={48} color="#0f766e" style={{ marginBottom: 16 }} />
                <Text style={styles.modalSuccessText}>To'lov muvaffaqiyatli!</Text>
                <TouchableOpacity 
                  style={styles.modalBtn}
                  onPress={() => { setShowPayModal(false); handleSubmit(); }}
                >
                  <Text style={styles.modalBtnText}>E'lonni berish</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.modalInfoBox}>
                  <Text style={styles.modalInfoLabel}>E'lon to'lovi</Text>
                  <Text style={styles.modalInfoValue}>{(quota?.feeAmount || 10000).toLocaleString()} so'm</Text>
                </View>

                {!feeToken ? (
                  <TouchableOpacity 
                    style={[styles.modalPayBtn, payStep === "confirming" && styles.modalPayBtnDisabled]}
                    onPress={initiatePayment}
                    disabled={payStep === "confirming"}
                  >
                    {payStep === "confirming" ? <ActivityIndicator color="#fff" /> : <CreditCard size={20} color="#fff" />}
                    <Text style={styles.modalBtnText}>To'lovni boshlash</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.modalConfirmBtn, payStep === "confirming" && styles.modalPayBtnDisabled]}
                    onPress={confirmPayment}
                    disabled={payStep === "confirming"}
                  >
                    {payStep === "confirming" ? <ActivityIndicator color="#fff" /> : <CheckCircle size={20} color="#fff" />}
                    <Text style={styles.modalBtnText}>Tasdiqlash</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.modalCancelBtn} onPress={closePayModal}>
                  <Text style={styles.modalCancelText}>Bekor qilish</Text>
                </TouchableOpacity>
              </View>
            )}
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
  quotaBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  quotaBannerSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  quotaBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  quotaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  quotaTextSuccess: {
    color: '#166534',
  },
  quotaTextWarning: {
    color: '#92400e',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  imageSlot: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.borderWarm,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  addImageText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  genreScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  genreBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    marginRight: 8,
    backgroundColor: theme.colors.background,
  },
  genreBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(15,118,110,0.1)',
  },
  genreText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  genreTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  typesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    backgroundColor: theme.colors.background,
  },
  typeBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(15,118,110,0.05)',
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  typeTitleActive: {
    color: theme.colors.primary,
  },
  typeDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  quickDaysRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickDayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  quickDayBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(15,118,110,0.1)',
  },
  quickDayText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  quickDayTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gpsBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  gpsBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(15,118,110,0.1)',
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInfoBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#92400e',
  },
  modalInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  modalPayBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalConfirmBtn: {
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalPayBtnDisabled: {
    opacity: 0.6,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  modalSuccess: {
    alignItems: 'center',
  },
  modalSuccessText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  }
});
