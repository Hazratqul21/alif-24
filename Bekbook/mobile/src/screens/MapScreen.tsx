import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import apiService, { Book, Store } from '../services/api';
import { theme } from '../theme/theme';
import { MapPin, BookOpen, Layers, Library } from 'lucide-react-native';

export default function MapScreen({ navigation }: { navigation: any }) {
  // Tashkent coordinates as fallback center
  const DEFAULT_REGION = {
    latitude: 41.311081,
    longitude: 69.240562,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const [nearbyBooks, setNearbyBooks] = useState<Book[]>([]);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ type: 'book' | 'store'; data: any } | null>(null);

  const fetchNearbyItems = async () => {
    try {
      const data = await apiService.getNearby({
        lat: DEFAULT_REGION.latitude,
        lng: DEFAULT_REGION.longitude,
        radius: 10, // 10km
      });
      setNearbyBooks(data.books || []);
      setNearbyStores(data.stores || []);
    } catch (error) {
      console.error('Error fetching nearby points:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyItems();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Atrofdagi Kitoblar Xaritasi</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderText}>Xarita yuklanmoqda...</Text>
        </View>
      ) : (
        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            showsUserLocation={true}
          >
            {/* Book Markers */}
            {nearbyBooks.map((book) => {
              const lat = book.lat || DEFAULT_REGION.latitude + (Math.random() - 0.5) * 0.02;
              const lng = book.lng || DEFAULT_REGION.longitude + (Math.random() - 0.5) * 0.02;
              return (
                <Marker
                  key={`book-${book.id}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  pinColor={theme.colors.primary}
                  onPress={() => setSelectedItem({ type: 'book', data: book })}
                >
                  <Callout tooltip>
                    <View style={styles.calloutCard}>
                      <Text style={styles.calloutTitle}>{book.title}</Text>
                      <Text style={styles.calloutSub}>{book.author}</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}

            {/* Store/Library Markers */}
            {nearbyStores.map((store) => {
              const lat = store.lat || DEFAULT_REGION.latitude + (Math.random() - 0.5) * 0.02;
              const lng = store.lng || DEFAULT_REGION.longitude + (Math.random() - 0.5) * 0.02;
              return (
                <Marker
                  key={`store-${store.id}`}
                  coordinate={{ latitude: lat, longitude: lng }}
                  pinColor={theme.colors.secondary}
                  onPress={() => setSelectedItem({ type: 'store', data: store })}
                >
                  <Callout tooltip>
                    <View style={[styles.calloutCard, { borderColor: theme.colors.secondary }]}>
                      <Text style={styles.calloutTitle}>{store.name}</Text>
                      <Text style={styles.calloutSub}>Kutubxona / Do'kon</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>

          {/* Interactive Card detail overlay at bottom */}
          {selectedItem && (
            <View style={styles.detailCardOverlay}>
              <View style={styles.cardHeader}>
                <View style={styles.cardBadge}>
                  {selectedItem.type === 'book' ? (
                    <BookOpen size={16} color={theme.colors.primary} />
                  ) : (
                    <Library size={16} color={theme.colors.secondary} />
                  )}
                  <Text style={[
                    styles.badgeText,
                    { color: selectedItem.type === 'book' ? theme.colors.primary : theme.colors.secondary }
                  ]}>
                    {selectedItem.type === 'book' ? 'Kitob' : 'Kutubxona'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedItem(null)}>
                  <Text style={styles.closeText}>Yopish</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>{selectedItem.data.title || selectedItem.data.name}</Text>
              <Text style={styles.cardSubText}>{selectedItem.data.author || selectedItem.data.address}</Text>

              <TouchableOpacity
                style={[
                  styles.viewBtn,
                  { backgroundColor: selectedItem.type === 'book' ? theme.colors.primary : theme.colors.secondary }
                ]}
                onPress={() => {
                  if (selectedItem.type === 'book') {
                    navigation.navigate('BookDetail', { bookId: selectedItem.data.id });
                  }
                  // Optionally add store navigation if screen created
                }}
              >
                <Text style={styles.viewBtnText}>Batafsil ko'rish</Text>
              </TouchableOpacity>
            </View>
          )}
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
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderWarm,
    paddingTop: 28,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  calloutCard: {
    backgroundColor: '#fff',
    borderRadius: theme.roundness.sm,
    padding: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    width: 150,
  },
  calloutTitle: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 12,
    color: theme.colors.text,
  },
  calloutSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  detailCardOverlay: {
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
    borderWidth: 1,
    borderColor: theme.colors.borderWarm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.roundness.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    marginLeft: 4,
  },
  closeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.semibold,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  cardSubText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  viewBtn: {
    height: 40,
    borderRadius: theme.roundness.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.sm,
  },
});
