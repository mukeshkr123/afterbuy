import { useOAuth, useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
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

  const handleSocialSignIn = async (
    strategy: "oauth_apple" | "oauth_google"
  ) => {
    const provider = strategy === "oauth_apple" ? "apple" : "google";
    setSocialLoading(provider);
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
      <ScreenScroll gap={tokens.spacing.lg} contentStyle={styles.scrollContent}>
        <ScreenHeader
          title=""
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/welcome")
          }
        />

        <View style={styles.heading}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: tokens.colors.textStrong }]}
          >
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: tokens.colors.textSubtle }]}>
            Sign in to continue to AfterBuy.
          </Text>
        </View>

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
            <Text style={[styles.linkText, { color: tokens.colors.accent }]}>
              Forgot password?
            </Text>
          </Pressable>

          <FormError message={error} />

          <Button
            label={pending ? "Signing in..." : "Sign in"}
            disabled={pending || socialLoading !== null}
            busy={pending}
            size="lg"
            onPress={() => void onSubmit()}
          />
        </View>

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
            or continue with
          </Text>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: tokens.colors.border },
            ]}
          />
        </View>

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

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: tokens.colors.textMuted }]}>
            Don&apos;t have an account?{" "}
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable accessibilityRole="link" hitSlop={10}>
              <Text style={[styles.linkText, { color: tokens.colors.accent }]}>
                Create account
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    paddingBottom: 32,
  },
  heading: { gap: 6, marginTop: 8, marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  form: { gap: 13 },
  adornmentPress: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotTouch: {
    minHeight: 34,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 6,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  socialBlock: { gap: 10 },
  footerRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
});
