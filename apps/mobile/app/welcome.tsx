import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { OnboardingHubIllustration } from "@/components/onboarding/OnboardingHubIllustration";
import { OnboardingReceiptScanIllustration } from "@/components/onboarding/OnboardingReceiptScanIllustration";
import { OnboardingDeadlineIllustration } from "@/components/onboarding/OnboardingDeadlineIllustration";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  headline: string;
  supportingCopy: string;
  IllustrationComponent: React.ComponentType;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    headline: "Every purchase,\nall in one place.",
    supportingCopy:
      "Track receipts, deliveries, returns, warranties,\nand claims without searching across different apps.",
    IllustrationComponent: OnboardingHubIllustration,
  },
  {
    id: "2",
    headline: "Receipts, organized\nautomatically.",
    supportingCopy:
      "Save digital receipts and keep every purchase\ndetail easy to find.",
    IllustrationComponent: OnboardingReceiptScanIllustration,
  },
  {
    id: "3",
    headline: "Never miss an important\ndeadline.",
    supportingCopy:
      "Get timely reminders before return windows\nand warranties expire.",
    IllustrationComponent: OnboardingDeadlineIllustration,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
          setActiveIndex(index);
        }
      },
    }
  );

  const scrollToSlide = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setActiveIndex(index);
  };

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
          paddingTop: Math.max(insets.top + 4, 16),
          paddingBottom: Math.max(insets.bottom + 8, 20),
          backgroundColor: tokens.colors.canvas,
        },
      ]}
    >
      {/* Top Header & Brand Bar (Identical 44px height across all slides) */}
      <View style={styles.headerContainer}>
        {/* Brand mark: Icon + subtle wordmark on slide 1, Icon only on slide 2 & 3 */}
        <View style={styles.brandMarkContainer}>
          <Image
            source={require("../assets/logo_icon.png")}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          {activeIndex === 0 && (
            <Text style={[styles.brandTitle, { color: tokens.colors.text }]}>
              AfterBuy
            </Text>
          )}
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
              <View key={slide.id} style={styles.slide}>
                {/* Product Illustration */}
                <View style={styles.illustrationWrapper}>
                  <Illustration />
                </View>

                {/* Typography Block */}
                <View style={styles.textBlock}>
                  <Text
                    style={[styles.headlineText, { color: tokens.colors.text }]}
                  >
                    {slide.headline}
                  </Text>
                  <Text
                    style={[
                      styles.supportingCopyText,
                      { color: tokens.colors.textSubtle },
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

      {/* Segmented Progress Bar */}
      <View style={styles.paginationRow}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: "clamp",
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
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
      <View style={styles.footerContainer}>
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
              borderRadius: 16,
              ...tokens.shadow.raised,
            },
            pressed && { opacity: 0.93, transform: [{ scale: 0.985 }] },
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
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
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
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    width: "100%",
    height: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 24,
  },
  headlineText: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
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
    gap: 8,
    marginVertical: 14,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  footerContainer: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: "center",
    width: "100%",
  },
  primaryButton: {
    width: "100%",
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 17,
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
    fontWeight: "700",
  },
});
