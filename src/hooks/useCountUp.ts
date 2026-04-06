/**
 * useCountUp
 *
 * Animates a numeric value from 0 to `target` using Easing.out(Easing.cubic).
 * Returns the current interpolated display value so the caller can format it.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

export function useCountUp(target: number, duration = 900, delay = 0): number {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.stopAnimation();
    anim.setValue(0);
    anim.removeAllListeners();

    const id = anim.addListener(({ value }) => setDisplay(value));
    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: target,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);

    return () => {
      clearTimeout(timer);
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [target, duration, delay, anim]);

  return display;
}
