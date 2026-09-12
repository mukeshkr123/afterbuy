import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { Ionicons } from "@expo/vector-icons";
import { WelcomeHeroIllustration } from "@/components/onboarding/WelcomeHeroIllustration";
import { IntroHeroIllustration } from "@/components/onboarding/IntroHeroIllustration";
import { ReceiptHeroIllustration } from "@/components/onboarding/ReceiptHeroIllustration";
import { DeadlineHeroIllustration } from "@/components/onboarding/DeadlineHeroIllustration";
import { useTheme } from "@/theme/ThemeProvider";

type FeatureItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
};

const INTRO_ITEMS: readonly FeatureItem[] = [
  {
    title: "Track Purchases",
    subtitle: "Store receipts, order details, and store info in one place.",
    icon: "bag-handle-outline",
    iconColor: "#5B43F6",
    iconBg: "#F3F0FF",
  },
  {
    title: "Returns & Claims",
    subtitle: "Track return windows and file claims with ease.",
    icon: "shield-checkmark-outline",
    iconColor: "#16A34A",
    iconBg: "#F0FDF4",
  },
  {
    title: "Warranties & Reminders",
    subtitle: "Get reminders before warranties expire.",
    icon: "notifications-outline",
    iconColor: "#D97706",
    iconBg: "#FEFCE8",
  },
  {
    title: "Secure & Private",
    subtitle: "Your data is encrypted and never shared.",
    icon: "lock-closed-outline",
    iconColor: "#475569",
    iconBg: "#F1F5F9",
  },
];

const SLIDES = ["splash", "intro", "receipt", "deadline"] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, reducedMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const expanded = width >= 768 || width > height;
  const short = !expanded && height < 740;
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
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    setActiveIndex(0);
  }, []);

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
          paddingTop: Math.max(insets.top, 14),
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: tokens.colors.canvas,
        },
      ]}
    >
      {/* Top Bar with Skip pill */}
      <View style={[styles.topBar, { paddingHorizontal: tokens.spacing.xl }]}>
        <View />
        <Pressable
          onPress={() => router.push("/(auth)/sign-up")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={styles.skipPill}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Slide Carousel */}
      <View style={styles.carousel}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentOffset={{ x: 0, y: 0 }}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {SLIDES.map((slide) => (
            <View
              key={slide}
              style={[
                styles.slide,
                {
                  width,
                  paddingHorizontal: expanded
                    ? 40
                    : slide === "splash"
                      ? 0
                      : 16,
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
                <ReceiptPanel compact={short} />
              ) : (
                <DeadlinePanel compact={short} />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Pagination Row */}
      <View style={styles.paginationRow}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.24, 1, 0.24],
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
                    opacity: dotOpacity,
                    backgroundColor: "#4F46E5",
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Bottom Footer Actions */}
      <View style={[styles.footer, { paddingHorizontal: tokens.spacing.xl }]}>
        <Pressable
          onPress={handlePrimary}
          accessibilityRole="button"
          accessibilityLabel={
            activeIndex === 0
              ? "Get started"
              : activeIndex === SLIDES.length - 1
                ? "Create account"
                : "Next"
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && !reducedMotion && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {activeIndex === 0
              ? "Get started"
              : activeIndex === SLIDES.length - 1
                ? "Create account"
                : "Next"}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
            style={styles.primaryButtonIcon}
          />
        </Pressable>

        <View style={styles.signInRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            hitSlop={12}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
          >
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SplashPanel({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.splashPanel, compact && styles.splashPanelCompact]}>
      <WelcomeHeroIllustration compact={compact} />
      <View style={styles.splashTextContainer}>
        <Text accessibilityRole="header" style={styles.brandTitle}>
          AfterBuy
        </Text>
        <Text style={styles.headline}>
          Keep track of everything{"\n"}you buy,{" "}
          <Text style={styles.headlineHighlight}>effortlessly.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Save receipts, track returns, warranties,{"\n"}and get reminders — all
          in one place.
        </Text>
      </View>
    </View>
  );
}

function IntroPanel({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.introPanel, compact && styles.introPanelCompact]}>
      <IntroHeroIllustration compact={compact} />
      <View style={styles.introTextContainer}>
        <Text accessibilityRole="header" style={styles.brandTitleIntro}>
          AfterBuy
        </Text>
        <Text style={styles.headlineIntro}>
          Everything you buy,{"\n"}
          <Text style={styles.headlineHighlight}>organized beautifully.</Text>
        </Text>
        <Text style={styles.subtitleIntro}>
          Save receipts, track returns, warranties, and get reminders — all in
          one place.
        </Text>
      </View>
      <View style={styles.featureCardsList}>
        {INTRO_ITEMS.map((item) => (
          <View key={item.title} style={styles.featureCard}>
            <View
              style={[styles.featureIconBox, { backgroundColor: item.iconBg }]}
            >
              <Ionicons name={item.icon} size={20} color={item.iconColor} />
            </View>
            <View style={styles.featureCardText}>
              <Text style={styles.featureCardTitle}>{item.title}</Text>
              <Text style={styles.featureCardSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
        ))}
      </View>
    </View>
  );
}

function ReceiptPanel({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.storyPanel, compact && styles.storyPanelCompact]}>
      <ReceiptHeroIllustration compact={compact} />
      <View style={styles.storyTextContainer}>
        <Text accessibilityRole="header" style={styles.storyHeadline}>
          Receipts stay ready.
        </Text>
        <Text style={styles.storySubtitle}>
          Capture proof of purchase before the box{"\n"}gets recycled or the
          email disappears.
        </Text>
      </View>
    </View>
  );
}

function DeadlinePanel({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.storyPanel, compact && styles.storyPanelCompact]}>
      <DeadlineHeroIllustration compact={compact} />
      <View style={styles.storyTextContainer}>
        <Text accessibilityRole="header" style={styles.storyHeadline}>
          Deadlines stay visible.
        </Text>
        <Text style={styles.storySubtitle}>
          Return windows, warranties, and claims{"\n"}surface before they become
          expensive surprises.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipPill: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#EEF0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  skipPlaceholder: { width: 44, height: 44 },
  carousel: { flex: 1, justifyContent: "center" },
  scrollView: { flex: 1 },
  scrollContent: { alignItems: "center" },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  splashPanel: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  splashPanelCompact: {
    transform: [{ scale: 0.92 }],
  },
  splashTextContainer: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.6,
    marginTop: 14,
  },
  headline: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: -0.4,
  },
  headlineHighlight: {
    color: "#4F46E5",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 320,
    alignSelf: "center",
    fontWeight: "400",
  },
  introPanel: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
  },
  introPanelCompact: {
    transform: [{ scale: 0.93 }],
  },
  brandTitleIntro: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headlineIntro: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  subtitleIntro: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 325,
    alignSelf: "center",
  },
  introTextContainer: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  featureCardsList: {
    width: "100%",
    paddingHorizontal: 16,
    gap: 7,
    marginTop: 10,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  featureCardText: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  featureCardSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1.5,
    lineHeight: 15,
  },
  storyPanel: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  storyPanelCompact: {
    transform: [{ scale: 0.94 }],
  },
  storyTextContainer: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 4,
  },
  storyHeadline: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  storySubtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 330,
    alignSelf: "center",
  },
  paginationRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  footer: { width: "100%", maxWidth: 460, alignSelf: "center", gap: 8 },
  primaryButton: {
    height: 52,
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    position: "relative",
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  primaryButtonIcon: {
    position: "absolute",
    right: 22,
  },
  signInRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 14, fontWeight: "500", color: "#64748B" },
  footerLink: { fontSize: 14, fontWeight: "700", color: "#4F46E5" },
});
