import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AuthHeroIllustration,
  Button,
  FormError,
  Input,
  ScreenScroll,
  SocialAuthButton,
} from "@/components";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const showAppleSignIn = Platform.OS === "ios";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"apple" | "google" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleSocialSignIn = async (
    strategy: "oauth_apple" | "oauth_google"
  ) => {
    const provider = strategy === "oauth_apple" ? "apple" : "google";
    setSocialLoading(provider);
    setError(null);
    try {
      const flow =
        strategy === "oauth_apple" ? startAppleOAuth : startGoogleOAuth;
      const { createdSessionId, setActive: setOAuthActive } = await flow({
        redirectUrl: Linking.createURL("/oauth-callback", {
          scheme: "afterbuy",
        }),
      });
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Social authentication was canceled or failed."
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const onSubmit = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else if (result.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        router.push("/(auth)/mfa");
      } else {
        setError("Additional verification required.");
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Your email or password is incorrect."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Ambient pastel glow */}
      <View style={styles.ambientGlow} pointerEvents="none" />

      <ScreenScroll gap={0} contentStyle={styles.scrollContent}>
        {/* Top Back Button */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/welcome")
            }
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>
        </View>

        {/* 3D Hero Illustration */}
        <AuthHeroIllustration />

        {/* Heading */}
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Welcome back
          </Text>
          <Text style={styles.subtitle}>Sign in to continue to AfterBuy.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            leadingIcon={
              <Ionicons name="mail-outline" size={19} color="#64748B" />
            }
          />

          <Input
            ref={passwordInputRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
            leadingIcon={
              <Ionicons name="lock-closed-outline" size={19} color="#64748B" />
            }
            adornment={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                hitSlop={8}
                style={styles.adornmentPress}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            }
          />

          {/* Forgot Password Link */}
          <Pressable
            onPress={() => {
              const trimmed = email.trim();
              router.push(
                trimmed
                  ? {
                      pathname: "/(auth)/forgot-password",
                      params: { email: trimmed },
                    }
                  : "/(auth)/forgot-password"
              );
            }}
            accessibilityRole="link"
            accessibilityLabel="Forgot password?"
            hitSlop={10}
            style={styles.forgotTouch}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <FormError message={error} />

          {/* Primary Action Button */}
          <Button
            label={pending ? "Signing in..." : "Sign in"}
            trailing={
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            }
            disabled={pending || socialLoading !== null}
            busy={pending}
            size="lg"
            onPress={() => void onSubmit()}
            style={styles.primaryButton}
          />
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Auth */}
        <View style={styles.socialBlock}>
          {showAppleSignIn ? (
            <SocialAuthButton
              provider="apple"
              onPress={() => void handleSocialSignIn("oauth_apple")}
              loading={socialLoading === "apple"}
              disabled={pending || socialLoading !== null}
            />
          ) : null}
          <SocialAuthButton
            provider="google"
            onPress={() => void handleSocialSignIn("oauth_google")}
            loading={socialLoading === "google"}
            disabled={pending || socialLoading !== null}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable accessibilityRole="link" hitSlop={10}>
              <Text style={styles.linkText}>Create account</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  ambientGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  topBar: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  heading: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
  form: {
    gap: 13,
  },
  adornmentPress: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotTouch: {
    minHeight: 28,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: -2,
    marginBottom: 2,
  },
  forgotText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "700",
    color: "#775DF5",
  },
  primaryButton: {
    marginTop: 6,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#775DF5",
    shadowColor: "#775DF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    color: "#64748B",
  },
  socialBlock: {
    gap: 10,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "#64748B",
    fontWeight: "500",
  },
  linkText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "700",
    color: "#775DF5",
  },
});
