import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  BackHandler,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Linking,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_URL = 'https://monexo.wiki/';
const CUSTOM_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const INJECTED_JAVASCRIPT = `
  (function() {
    function fixBlankTargets() {
      var anchors = document.querySelectorAll('a[target="_blank"]');
      for (var i = 0; i < anchors.length; i++) {
        anchors[i].setAttribute('target', '_self');
      }
    }
    fixBlankTargets();
    var observer = new MutationObserver(fixBlankTargets);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  })();
  true;
`;

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [canGoBack]);

  const handleShouldStartLoad = (request) => {
    const { url } = request;
    if (!url) return true;

    // Deep links and payment intent schemes
    if (
      url.startsWith('upi://') ||
      url.startsWith('intent://') ||
      url.startsWith('paytmmp://') ||
      url.startsWith('phonepe://') ||
      url.startsWith('gpay://') ||
      url.startsWith('bhim://') ||
      url.startsWith('whatsapp://') ||
      url.startsWith('tg://')
    ) {
      Linking.openURL(url).catch((err) => {
        console.warn('Could not open external app link:', url, err);
      });
      return false;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (
        url.includes('t.me/') ||
        url.includes('telegram.me/') ||
        url.includes('wa.me/') ||
        url.includes('api.whatsapp.com')
      ) {
        Linking.openURL(url).catch((err) => {
          console.warn('Could not open external web link:', url, err);
        });
        return false;
      }
      return true;
    }

    // Default external scheme handler
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open scheme:', url, err);
    });
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        startInLoadingState={false}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        userAgent={CUSTOM_USER_AGENT}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setLoading(false);
          setError(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent.statusCode);
        }}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load Monexo</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(false);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
