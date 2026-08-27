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
import { useTheme } from "@/theme/ThemeProvider";
import { OnboardingHubIllustration } from "@/components/onboarding/OnboardingHubIllustration";
import { OnboardingReceiptScanIllustration } from "@/components/onboarding/OnboardingReceiptScanIllustration";
import { OnboardingDeadlineIllustration } from "@/components/onboarding/OnboardingDeadlineIllustration";

interface OnboardingSlide {
  id: string;
  headline: string;
  supportingCopy: string;
  IllustrationComponent: React.ComponentType<{ compact?: boolean }>;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    headline: "Every purchase in one place.",
    supportingCopy:
      "Receipts, deliveries, returns, and warranties — always easy to find.",
    IllustrationComponent: OnboardingHubIllustration,
  },
  {
    id: "2",
    headline: "Receipts, ready when needed.",
    supportingCopy:
      "Save a photo or attach a receipt directly to your purchase.",
    IllustrationComponent: OnboardingReceiptScanIllustration,
  },
  {
    id: "3",
    headline: "Know what needs attention.",
    supportingCopy:
      "Get a quiet reminder before a return window or warranty expires.",
    IllustrationComponent: OnboardingDeadlineIllustration,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, reducedMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const expanded = width >= 768 || width > height;
  const short = !expanded && height < 680;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / width);
        if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
          setActiveIndex(index);
        }
      },
    }
  );

  const scrollToSlide = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * width,
      animated: !reducedMotion,
    });
    setActiveIndex(index);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: activeIndex * width, animated: false });
  }, [activeIndex, width]);

  const handlePrimaryAction = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollToSlide(activeIndex + 1);
    } else {
      router.push("/(auth)/sign-up");
    }
  };

  const handleSkip = () => {
    router.push("/(auth)/sign-up");
  };

  const accentColor = tokens.colors.accent;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 6, 16),
          paddingBottom: Math.max(insets.bottom + 8, 20),
          backgroundColor: tokens.colors.canvas,
        },
      ]}
    >
      {/* Top Header & Brand Bar (Identical across all slides) */}
      <View
        style={[
          styles.headerContainer,
          { width: "100%", maxWidth: 960, alignSelf: "center" },
        ]}
      >
        {/* Brand mark: Icon + wordmark consistently across slides */}
        <View style={styles.brandMarkContainer}>
          <Image
            source={require("../assets/logo_icon.png")}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: tokens.colors.text }]}>
            AfterBuy
          </Text>
        </View>

        {/* Top Right Action: "Skip" on slides 1 & 2, empty layout placeholder on slide 3 */}
        {activeIndex < SLIDES.length - 1 ? (
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            style={({ pressed }) => [
              styles.skipButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[styles.skipText, { color: tokens.colors.textSubtle }]}
            >
              Skip
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>

      {/* Main Carousel View */}
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {SLIDES.map((slide) => {
            const Illustration = slide.IllustrationComponent;
            return (
              <View
                key={slide.id}
                style={[
                  styles.slide,
                  {
                    width,
                    maxWidth: width,
                    flexDirection: expanded ? "row" : "column",
                    gap: expanded ? 48 : 0,
                  },
                ]}
              >
                {/* Product Illustration */}
                <View
                  style={[
                    styles.illustrationWrapper,
                    short && styles.illustrationShort,
                    expanded && styles.illustrationExpanded,
                  ]}
                >
                  <Illustration compact={short} />
                </View>

                {/* Typography Block */}
                <View
                  style={[
                    styles.textBlock,
                    short && styles.textBlockShort,
                    expanded && styles.textBlockExpanded,
                  ]}
                >
                  <Text
                    style={[
                      styles.headlineText,
                      {
                        color: tokens.colors.text,
                        textAlign: expanded ? "left" : "center",
                        fontSize: short ? 25 : 29,
                        lineHeight: short ? 31 : 35,
                      },
                    ]}
                  >
                    {slide.headline}
                  </Text>
                  <Text
                    style={[
                      styles.supportingCopyText,
                      {
                        color: tokens.colors.textSubtle,
                        textAlign: expanded ? "left" : "center",
                      },
                    ]}
                  >
                    {slide.supportingCopy}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Segmented Progress Indicator */}
      <View style={[styles.paginationRow, short && styles.paginationRowShort]}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [7, 20, 7],
            extrapolate: "clamp",
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.25, 1, 0.25],
            extrapolate: "clamp",
          });

          return (
            <Pressable
              key={index}
              onPress={() => scrollToSlide(index)}
              accessibilityRole="button"
              accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}
              accessibilityState={{ selected: index === activeIndex }}
              hitSlop={12}
            >
              <Animated.View
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Bottom CTA Block */}
      <View
        style={[
          styles.footerContainer,
          short && styles.footerShort,
          { maxWidth: 440, alignSelf: "center" },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeIndex === SLIDES.length - 1
              ? "Get Started with AfterBuy"
              : "Next onboarding slide"
          }
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: accentColor,
              borderRadius: 14,
              ...tokens.shadow.raised,
            },
            pressed && {
              opacity: 0.9,
              transform: [{ scale: reducedMotion ? 1 : 0.985 }],
            },
          ]}
          onPress={handlePrimaryAction}
        >
          <Text
            style={[
              styles.primaryButtonText,
              { color: tokens.colors.accentText },
            ]}
          >
            {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>

        <View style={styles.signInRow}>
          <Text
            style={[styles.haveAccountText, { color: tokens.colors.textMuted }]}
          >
            Already have an account?{" "}
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-in")}
            hitSlop={12}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
            style={styles.signInLinkTouchTarget}
          >
            <Text style={[styles.signInLink, { color: accentColor }]}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    height: 44,
  },
  brandMarkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  scrollContent: {
    alignItems: "center",
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationShort: {
    height: 185,
  },
  illustrationExpanded: {
    flex: 1,
    maxWidth: 440,
    height: 280,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 20,
  },
  textBlockShort: {
    marginTop: 8,
  },
  textBlockExpanded: {
    flex: 1,
    alignItems: "flex-start",
    maxWidth: 420,
  },
  headlineText: {
    fontSize: 29,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 35,
    letterSpacing: -0.5,
    marginBottom: 8,
    maxWidth: 330,
  },
  supportingCopyText: {
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
    marginBottom: 16,
  },
  paginationRowShort: {
    marginTop: 6,
    marginBottom: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  footerContainer: {
    paddingHorizontal: 24,
    gap: 18,
    alignItems: "center",
    width: "100%",
  },
  footerShort: {
    gap: 10,
  },
  primaryButton: {
    width: "100%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  haveAccountText: {
    fontSize: 14,
    fontWeight: "400",
  },
  signInLinkTouchTarget: {
    minHeight: 44,
    justifyContent: "center",
  },
  signInLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
