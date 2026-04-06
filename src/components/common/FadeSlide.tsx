/**
 * FadeSlide
 *
 * Wraps children in an Animated.View that fades in and slides up from 28px
 * below its resting position.  Controlled by the `trigger` prop — animation
 * starts once trigger becomes true, with an optional `delay` in ms.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface Props {
  children: React.ReactNode;
  trigger: boolean;
  delay?: number;
}

export function FadeSlide({ children, trigger, delay = 0 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    if (!trigger) return;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [trigger, delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
