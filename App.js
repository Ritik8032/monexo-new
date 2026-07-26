import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, PermissionsAndroid, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const TARGET_URL = "https://monexo-new.onrender.com";

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        try {
          const grantedSMS = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          ]);
          console.log('Permissions result:', grantedSMS);
        } catch (err) {
          console.warn('Error requesting permissions:', err);
        }
      }
    }
    requestPermissions();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <WebView
        source={{ uri: TARGET_URL }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowFileAccess={true}
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
});
