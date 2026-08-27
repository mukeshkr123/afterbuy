import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FormError,
  Input,
  ScreenHeader,
  ScreenScroll,
  SocialAuthButton,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { tokens } = useTheme();

  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"apple" | "google" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const passwordInputRef = useRef<TextInput>(null);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSocialSignIn = async (
    strategy: "oauth_apple" | "oauth_google"
  ) => {
    const providerKey = strategy === "oauth_apple" ? "apple" : "google";
    setSocialLoading(providerKey);
    setError(null);
    try {
      const flow =
        strategy === "oauth_apple" ? startAppleOAuth : startGoogleOAuth;
      const { createdSessionId, setActive: setOAuthActive } = await flow();
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address first to reset your password.");
      return;
    }
    setError(null);
    try {
      if (signIn && isLoaded) {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: email.trim(),
        });
        Alert.alert(
          "Password Reset Sent",
          `A password reset code has been sent to ${email.trim()}.`
        );
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Unable to initiate password reset."
      );
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
      style={{ flex: 1 }}
    >
      <ScreenScroll gap={12} contentStyle={styles.scrollContainer}>
        {/* Top Header */}
        <ScreenHeader
          title=""
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/welcome")
          }
        />

        {/* Heading & Supporting Text */}
        <View style={styles.headingBlock}>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color: tokens.colors.text,
              },
            ]}
          >
            Welcome back
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: tokens.colors.textSubtle,
              },
            ]}
          >
            Sign in to manage your purchases, returns, and warranties.
          </Text>
        </View>

        {/* Social Authentication Section */}
        <View style={styles.socialBlock}>
          <SocialAuthButton
            provider="apple"
            onPress={() => void handleSocialSignIn("oauth_apple")}
            loading={socialLoading === "apple"}
            disabled={pending || socialLoading !== null}
          />
          <SocialAuthButton
            provider="google"
            onPress={() => void handleSocialSignIn("oauth_google")}
            loading={socialLoading === "google"}
            disabled={pending || socialLoading !== null}
          />
        </View>

        {/* Section Divider */}
        <View style={styles.dividerRow}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: tokens.colors.border },
            ]}
          />
          <Text
            style={[styles.dividerText, { color: tokens.colors.textMuted }]}
          >
            or continue with email
          </Text>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: tokens.colors.border },
            ]}
          />
        </View>

        {/* Email & Password Form */}
        <View style={styles.formBlock}>
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
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
            labelAccessory={
              <Pressable
                onPress={() => void handleForgotPassword()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Forgot password?"
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    { color: tokens.colors.accent },
                  ]}
                >
                  Forgot password?
                </Text>
              </Pressable>
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
                  color={tokens.colors.textMuted}
                />
              </Pressable>
            }
          />

          <FormError message={error} />

          <Button
            label={pending ? "Signing in…" : "Sign in"}
            disabled={pending || socialLoading !== null}
            onPress={() => void onSubmit()}
          />

          <View style={styles.footerRow}>
            <Text
              style={[styles.footerText, { color: tokens.colors.textMuted }]}
            >
              Don&apos;t have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable
                hitSlop={8}
                accessibilityRole="link"
                accessibilityLabel="Create account"
                style={styles.footerLinkTouch}
              >
                <Text
                  style={[styles.footerLink, { color: tokens.colors.accent }]}
                >
                  Create account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 36,
  },
  headingBlock: {
    gap: 4,
    marginTop: 0,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
    maxWidth: 320,
  },
  socialBlock: {
    gap: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  formBlock: {
    gap: 14,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
  },
  adornmentPress: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "400",
  },
  footerLinkTouch: {
    minHeight: 48,
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
