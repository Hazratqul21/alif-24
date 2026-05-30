import React, { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { theme } from '../theme/theme';

export default function Alif24Screen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView 
        source={{ uri: 'https://alif24.uz' }} 
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        androidHardwareAccelerationDisabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    zIndex: 10,
  }
});
