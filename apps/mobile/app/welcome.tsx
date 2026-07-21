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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Everything you buy,\nmanaged in one place.",
    image: require("../assets/welcome_slide1.png"),
  },
  {
    id: "2",
    title: "Keep digital receipts\norganized automatically.",
    image: require("../assets/welcome_slide2.png"),
  },
  {
    id: "3",
    title: "Never miss a return\nor warranty deadline.",
    image: require("../assets/welcome_slide3.png"),
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

  const accentColor = tokens.colors.accent;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 8, 20),
          paddingBottom: Math.max(insets.bottom + 8, 24),
          backgroundColor: tokens.colors.canvas,
        },
      ]}
    >
      {/* App Branding Header */}
      <View style={styles.headerContainer}>
        <View style={styles.logoRow}>
          <Image
            source={require("../assets/logo_icon.png")}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: tokens.colors.text }]}>
            AfterBuy
          </Text>
        </View>
      </View>

      {/* Main Slide Carousel */}
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
          {SLIDES.map((slide) => (
            <View key={slide.id} style={styles.slide}>
              {/* Tagline / Title */}
              <Text style={[styles.slideTitle, { color: tokens.colors.text }]}>
                {slide.title}
              </Text>

              {/* Illustration Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={slide.image}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Animated Pagination Dots */}
      <View style={styles.paginationRow}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 22, 8],
            extrapolate: "clamp",
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });

          return (
            <Pressable
              key={index}
              onPress={() => scrollToSlide(index)}
              accessibilityRole="button"
              accessibilityLabel={`Go to slide ${index + 1} of ${SLIDES.length}`}
              accessibilityState={{ selected: index === activeIndex }}
              hitSlop={14}
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

      {/* Bottom CTA Actions */}
      <View style={styles.footerContainer}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.getStartedButton,
            {
              backgroundColor: accentColor,
              borderRadius: tokens.radius.xl,
              ...tokens.shadow.raised,
            },
            pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
          ]}
          onPress={() => router.push("/(auth)/sign-up")}
        >
          <Text
            style={[styles.getStartedText, { color: tokens.colors.accentText }]}
          >
            Get Started
          </Text>
        </Pressable>

        <View style={styles.signInRow}>
          <Text
            style={[styles.haveAccountText, { color: tokens.colors.textMuted }]}
          >
            Have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/sign-in")} hitSlop={8}>
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
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
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
    paddingHorizontal: 28,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  imageWrapper: {
    width: SCREEN_WIDTH * 0.82,
    height: SCREEN_WIDTH * 0.82,
    maxHeight: 310,
    maxWidth: 310,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footerContainer: {
    paddingHorizontal: 24,
    gap: 18,
    alignItems: "center",
    width: "100%",
  },
  getStartedButton: {
    width: "100%",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  haveAccountText: {
    fontSize: 15,
    fontWeight: "400",
  },
  signInLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
