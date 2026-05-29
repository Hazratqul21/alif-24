import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme/theme';
import { Focus, RefreshCw, Zap, ZapOff } from 'lucide-react-native';

export default function ScanScreen({ navigation }: { navigation: any }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashlight, setFlashlight] = useState(false);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    Alert.alert(
      'Skanerlandi',
      `Shtrix-kod turi: ${type}\nMa'lumot: ${data}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            // Search or view book based on ISBN data if it exists
            navigation.navigate('Home', { search: data });
          }
        }
      ]
    );
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.infoText}>Kameraga ruxsat so'ralmoqda...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kameradan foydalanishga ruxsat berilmagan.</Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Ruxsat Berish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shtrix / QR Kod Skaneri</Text>
      </View>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        enableTorch={flashlight}
      >
        <View style={styles.overlay}>
          {/* Target Scanning Overlay Frame */}
          <View style={styles.scanTarget}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Focus size={32} color="rgba(255,255,255,0.4)" style={styles.focusIcon} />
          </View>

          <Text style={styles.instructionText}>
            Kitobning orqa tomonidagi ISBN shtrix-kodini yoki platforma QR kodini kvadrat ichiga joylashtiring.
          </Text>

          {/* Floating actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionCircle}
              onPress={() => setFlashlight(!flashlight)}
            >
              {flashlight ? (
                <ZapOff size={24} color={theme.colors.surface} />
              ) : (
                <Zap size={24} color={theme.colors.surface} />
              )}
            </TouchableOpacity>

            {scanned && (
              <TouchableOpacity
                style={[styles.actionCircle, styles.refreshBtn]}
                onPress={() => setScanned(false)}
              >
                <RefreshCw size={24} color={theme.colors.surface} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  infoText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.md,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  permissionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.roundness.md,
  },
  permissionBtnText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  scanTarget: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  focusIcon: {
    position: 'absolute',
  },
  instructionText: {
    color: '#fff',
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 20,
    fontWeight: theme.typography.weights.medium,
  },
  actionsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  refreshBtn: {
    backgroundColor: theme.colors.secondary,
  },
});
