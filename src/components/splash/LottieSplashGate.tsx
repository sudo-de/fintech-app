import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';

const SPLASH_BG = '#0A0E21';
/** Ignore instant onAnimationFinish (some builds fire before the first frame draws). */
const MIN_INTRO_MS = 700;

type Props = {
  children: React.ReactNode;
};

/**
 * app.json splash is color-only → we hide native splash only after Lottie has laid out,
 * then play Finance.json. Modal keeps the intro above all app chrome on Android/iOS.
 */
export function LottieSplashGate({ children }: Props) {
  const { width: winW } = useWindowDimensions();
  const [showOverlay, setShowOverlay] = useState(true);
  const [lottieLaidOut, setLottieLaidOut] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeSplashHidden = useRef(false);
  const introStartedAt = useRef<number | null>(null);

  const hideNativeSplashOnce = useCallback(async () => {
    if (nativeSplashHidden.current) return;
    nativeSplashHidden.current = true;
    try {
      await SplashScreen.hideAsync();
    } catch {
      /* already hidden */
    }
  }, []);

  useEffect(() => {
    if (!lottieLaidOut) return;
    const t = setTimeout(() => {
      void hideNativeSplashOnce();
    }, Platform.OS === 'android' ? 48 : 16);
    return () => clearTimeout(t);
  }, [lottieLaidOut, hideNativeSplashOnce]);

  useEffect(() => {
    const t = setTimeout(() => void hideNativeSplashOnce(), 1800);
    return () => clearTimeout(t);
  }, [hideNativeSplashOnce]);

  const dismissOverlay = useCallback(() => {
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    const elapsed = introStartedAt.current != null ? Date.now() - introStartedAt.current : MIN_INTRO_MS;
    const wait = Math.max(0, MIN_INTRO_MS - elapsed);
    const runFade = () => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowOverlay(false);
      });
    };
    if (wait > 0) {
      setTimeout(runFade, wait);
    } else {
      runFade();
    }
  }, [overlayOpacity]);

  useEffect(() => {
    fallbackTimer.current = setTimeout(dismissOverlay, 14000);
    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, [dismissOverlay]);

  const onLottieFinish = useCallback(
    (isCancelled?: boolean) => {
      if (isCancelled) return;
      dismissOverlay();
    },
    [dismissOverlay]
  );

  const lottieSize = Math.min(winW * 0.92, 420);

  return (
    <View style={styles.root}>
      {children}
      <Modal
        visible={showOverlay}
        animationType="none"
        transparent
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={() => {}}
      >
        <Animated.View
          style={[styles.overlay, { backgroundColor: SPLASH_BG, opacity: overlayOpacity }]}
        >
          <LottieView
            source={require('../../../assets/Finance.json')}
            autoPlay
            loop={false}
            style={{ width: lottieSize, height: lottieSize }}
            resizeMode="contain"
            onLayout={() => {
              setLottieLaidOut(true);
              if (introStartedAt.current == null) introStartedAt.current = Date.now();
            }}
            onAnimationFinish={onLottieFinish}
          />
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
