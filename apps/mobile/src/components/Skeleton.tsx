import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  style,
}: SkeletonProps) {
  const { tokens, reducedMotion } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: tokens.radius.sm,
          backgroundColor: tokens.colors.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonGroup({ count, gap }: { count: number; gap?: number }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: gap ?? tokens.spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {},
});
