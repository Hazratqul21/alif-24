import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { theme } from '../theme/theme';
import apiService from '../services/api';
import { BookOpen, User, Lock, Mail, Phone } from 'lucide-react-native';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user', 'store_owner', 'library'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && (!name || !phone))) {
      setError('Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await apiService.login(email.trim().toLowerCase(), password);
      } else {
        await apiService.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash: password,
          phone: phone.trim(),
          role: role,
        });
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Logo/Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <BookOpen size={44} color={theme.colors.surface} />
            </View>
            <Text style={styles.logoText}>Bekbook</Text>
            <Text style={styles.subtext}>Mahalla kutubxonalari va kitob almashish tarmog'i</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{isLogin ? 'Tizimga Kirish' : 'Ro\'yxatdan O\'tish'}</Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <User size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="To'liq ismingiz"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Phone size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefon raqamingiz"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.roleContainer}>
                  <Text style={styles.roleTitle}>Hisob turini tanlang:</Text>
                  <View style={styles.roleOptions}>
                    <TouchableOpacity 
                      style={[styles.roleOption, role === 'user' && styles.roleOptionActive]}
                      onPress={() => setRole('user')}
                    >
                      <Text style={[styles.roleOptionText, role === 'user' && styles.roleOptionTextActive]}>O'quvchi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.roleOption, role === 'store_owner' && styles.roleOptionActive]}
                      onPress={() => setRole('store_owner')}
                    >
                      <Text style={[styles.roleOptionText, role === 'store_owner' && styles.roleOptionTextActive]}>Do'kon</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.roleOption, role === 'library' && styles.roleOptionActive]}
                      onPress={() => setRole('library')}
                    >
                      <Text style={[styles.roleOptionText, role === 'library' && styles.roleOptionTextActive]}>Kutubxona</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Mail size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail pochta manzili"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Parol"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isLogin ? 'Kirish' : 'Hisob Yaratish'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle Button */}
          <TouchableOpacity 
            style={styles.toggleBtn} 
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            <Text style={styles.toggleBtnText}>
              {isLogin 
                ? "Yangi hisob yaratmoqchimisiz? Ro'yxatdan o'ting" 
                : "Hisobingiz bormi? Tizimga kiring"
              }
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingTop: 70,
  },
  logoContainer: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.xl,
    marginBottom: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logoText: {
    fontSize: theme.typography.sizes.huge,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.secondary,
    fontFamily: theme.typography.fontFamily,
  },
  subtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: theme.roundness.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: theme.typography.sizes.md,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: theme.colors.surface,
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontWeight: theme.typography.weights.semibold,
  },
toggleBtn: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    padding: theme.spacing.sm,  // paddingPadding o'rniga padding
},
  toggleBtnText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  roleContainer: {
    marginBottom: theme.spacing.md,
  },
  roleTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  roleOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
    borderRadius: theme.roundness.sm,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleOptionText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.semibold,
  },
  roleOptionTextActive: {
    color: theme.colors.surface,
  },
});
