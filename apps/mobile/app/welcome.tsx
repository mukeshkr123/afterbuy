import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconTile } from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

type IntroItem = {
  title: string;
  subtitle: string;
  icon:
    | "bag-outline"
    | "shield-checkmark-outline"
    | "notifications-outline"
    | "lock-closed-outline";
  tone: "accent" | "success" | "warning" | "neutral";
};

const INTRO_ITEMS: readonly IntroItem[] = [
  {
    title: "Track Purchases",
    subtitle: "Store receipts, order details, and store info in one place.",
    icon: "bag-outline",
    tone: "accent",
  },
  {
    title: "Returns & Claims",
    subtitle: "Track return windows and file claims with ease.",
    icon: "shield-checkmark-outline",
    tone: "success",
  },
  {
    title: "Warranties & Reminders",
    subtitle: "Get reminders before warranties expire.",
    icon: "notifications-outline",
    tone: "warning",
  },
  {
    title: "Secure & Private",
    subtitle: "Your data is encrypted and never shared.",
    icon: "lock-closed-outline",
    tone: "neutral",
  },
];

const SLIDES = ["splash", "intro", "receipt", "deadline"] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, reducedMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const expanded = width >= 768 || width > height;
  const short = !expanded && height < 690;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== activeIndex && next >= 0 && next < SLIDES.length) {
      setActiveIndex(next);
    }
  };

  const lastWidth = useRef(width);
  useEffect(() => {
    if (width !== lastWidth.current) {
      lastWidth.current = width;
      scrollRef.current?.scrollTo({ x: activeIndex * width, animated: false });
    }
  }, [width, activeIndex]);

  const scrollToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: !reducedMotion });
    setActiveIndex(index);
  };

  const handlePrimary = () => {
    if (activeIndex < SLIDES.length - 1) scrollToSlide(activeIndex + 1);
    else router.push("/(auth)/sign-up");
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 10, 18),
          paddingBottom: Math.max(insets.bottom + 10, 22),
          backgroundColor: tokens.colors.canvas,
        },
      ]}
    >
      <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.xl }]}>
        <View />
        {activeIndex > 0 && activeIndex < SLIDES.length - 1 ? (
          <Pressable
            onPress={() => router.push("/(auth)/sign-up")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            style={styles.skipTouch}
          >
            <Text style={[styles.skipText, { color: tokens.colors.accent }]}>
              Skip
            </Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <View style={styles.carousel}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={styles.scrollContent}
        >
          {SLIDES.map((slide) => (
            <View
              key={slide}
              style={[
                styles.slide,
                {
                  width,
                  paddingHorizontal: expanded ? 40 : 28,
                  flexDirection:
                    expanded && slide !== "splash" ? "row" : "column",
                  gap: expanded && slide !== "splash" ? 44 : 0,
                },
              ]}
            >
              {slide === "splash" ? (
                <SplashPanel compact={short} />
              ) : slide === "intro" ? (
                <IntroPanel compact={short} />
              ) : slide === "receipt" ? (
                <StoryPanel
                  compact={short}
                  icon="receipt-outline"
                  title="Receipts stay ready."
                  copy="Capture proof of purchase before the box gets recycled or the email disappears."
                />
              ) : (
                <StoryPanel
                  compact={short}
                  icon="calendar-outline"
                  title="Deadlines stay visible."
                  copy="Return windows, warranties, and claims surface before they become expensive surprises."
                />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.paginationRow}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [7, 18, 7],
            extrapolate: "clamp",
          });
          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.22, 1, 0.22],
            extrapolate: "clamp",
          });
          return (
            <Pressable
              key={index}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Onboarding step ${index + 1} of ${SLIDES.length}`}
              accessibilityState={{ selected: activeIndex === index }}
              onPress={() => scrollToSlide(index)}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: tokens.colors.accent,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.footer, { paddingHorizontal: tokens.spacing.xl }]}>
        <Button
          label={
            activeIndex === 0
              ? "Get started"
              : activeIndex === SLIDES.length - 1
                ? "Create account"
                : "Next"
          }
          size="lg"
          onPress={handlePrimary}
        />
        <View style={styles.signInRow}>
          <Text style={[styles.footerText, { color: tokens.colors.textMuted }]}>
            Already have an account?{" "}
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            hitSlop={12}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
          >
            <Text style={[styles.footerLink, { color: tokens.colors.accent }]}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SplashPanel({ compact }: { compact: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.splashPanel}>
      <View
        style={[
          styles.logoHalo,
          {
            width: compact ? 96 : 118,
            height: compact ? 96 : 118,
            borderRadius: compact ? 30 : 34,
            backgroundColor: tokens.colors.accentSoft,
          },
        ]}
      >
        <Image
          source={require("../assets/logo_icon.png")}
          resizeMode="contain"
          style={styles.logoLarge}
        />
      </View>
      <Text
        accessibilityRole="header"
        style={[styles.brandTitle, { color: tokens.colors.textStrong }]}
      >
        AfterBuy
      </Text>
      <Text style={[styles.brandCopy, { color: tokens.colors.textSubtle }]}>
        Track purchases. Never miss a return or warranty again.
      </Text>
    </View>
  );
}

function IntroPanel({ compact }: { compact: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.introPanel, compact && styles.introPanelCompact]}>
      <View style={styles.headingBlock}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: tokens.colors.textStrong }]}
        >
          Everything you buy, organized beautifully.
        </Text>
      </View>
      <View style={[styles.featureList, { gap: tokens.spacing.md }]}>
        {INTRO_ITEMS.map((item) => (
          <View
            key={item.title}
            style={[
              styles.featureRow,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.xl,
              },
            ]}
          >
            <IconTile icon={item.icon} tone={item.tone} />
            <View style={styles.featureCopy}>
              <Text
                style={[styles.featureTitle, { color: tokens.colors.text }]}
              >
                {item.title}
              </Text>
              <Text
                style={[
                  styles.featureSubtitle,
                  { color: tokens.colors.textSubtle },
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StoryPanel({
  compact,
  icon,
  title,
  copy,
}: {
  compact: boolean;
  icon: "receipt-outline" | "calendar-outline";
  title: string;
  copy: string;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.storyPanel, compact && styles.storyPanelCompact]}>
      <IconTile icon={icon} tone="accent" size="lg" />
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          styles.storyTitle,
          { color: tokens.colors.textStrong },
        ]}
      >
        {title}
      </Text>
      <Text style={[styles.storyCopy, { color: tokens.colors.textSubtle }]}>
        {copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipTouch: { minHeight: 44, justifyContent: "center" },
  skipText: { fontSize: 15, fontWeight: "700" },
  skipPlaceholder: { width: 44, height: 44 },
  carousel: { flex: 1, justifyContent: "center" },
  scrollContent: { alignItems: "center" },
  slide: { alignItems: "center", justifyContent: "center" },
  splashPanel: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 330,
  },
  logoHalo: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoLarge: { width: 92, height: 92 },
  brandTitle: { fontSize: 38, lineHeight: 45, fontWeight: "800" },
  brandCopy: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 280,
  },
  introPanel: { width: "100%", maxWidth: 430, gap: 20 },
  introPanelCompact: { gap: 12 },
  headingBlock: { gap: 8 },
  title: { fontSize: 25, lineHeight: 32, fontWeight: "800" },
  featureList: { width: "100%" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  featureCopy: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  featureSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  storyPanel: { alignItems: "center", maxWidth: 330 },
  storyPanelCompact: { transform: [{ translateY: -12 }] },
  storyTitle: { marginTop: 24, textAlign: "center" },
  storyCopy: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  paginationRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: { height: 7, borderRadius: 999 },
  footer: { width: "100%", maxWidth: 460, alignSelf: "center", gap: 12 },
  signInRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 14, fontWeight: "500" },
  footerLink: { fontSize: 14, fontWeight: "800" },
});
