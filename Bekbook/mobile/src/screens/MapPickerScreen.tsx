import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { theme } from '../theme/theme';
import { MapPin, Check, ArrowLeft } from 'lucide-react-native';

export default function MapPickerScreen({ navigation, route }: { navigation: any, route: any }) {
  const { initialLat, initialLng, onSelect } = route.params || {};

  const DEFAULT_REGION = {
    latitude: initialLat || 41.311081,
    longitude: initialLng || 69.240562,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const [selectedCoord, setSelectedCoord] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  const handleConfirm = () => {
    if (onSelect) {
      onSelect({ lat: selectedCoord.latitude, lng: selectedCoord.longitude });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manzilni belgilang</Text>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          onPress={(e) => setSelectedCoord(e.nativeEvent.coordinate)}
        >
          <Marker
            coordinate={selectedCoord}
            draggable
            onDragEnd={(e) => setSelectedCoord(e.nativeEvent.coordinate)}
          >
            <View style={styles.markerContainer}>
              <MapPin size={40} color={theme.colors.primary} fill={theme.colors.primary} />
            </View>
          </Marker>
        </MapView>

        <View style={styles.bottomOverlay}>
          <Text style={styles.coordText}>
            Kenglik: {selectedCoord.latitude.toFixed(6)}
          </Text>
          <Text style={styles.coordText}>
            Uzunlik: {selectedCoord.longitude.toFixed(6)}
          </Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Check size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>Shu joyni tanlash</Text>
          </TouchableOpacity>
        </View>
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
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
    paddingTop: 28,
    paddingHorizontal: theme.spacing.md,
  },
  backBtn: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  coordText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    marginBottom: 4,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.roundness.md,
    marginTop: theme.spacing.md,
    gap: 8,
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.md,
  },
});
