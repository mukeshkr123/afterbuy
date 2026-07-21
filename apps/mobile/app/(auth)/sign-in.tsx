import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FormError,
  Input,
  ScreenHeader,
  ScreenScroll,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { tokens } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScreenScroll gap={tokens.spacing.xl}>
        <ScreenHeader
          title=""
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/welcome")
          }
        />

        <View style={{ gap: tokens.spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color: tokens.colors.text,
                fontSize: tokens.type.display.fontSize - 2,
              },
            ]}
          >
            Welcome back
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.body.fontSize,
              lineHeight: tokens.type.body.lineHeight,
            }}
          >
            Sign in to keep track of your purchases.
          </Text>
        </View>

        <View style={{ gap: tokens.spacing.lg }}>
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
            label={pending ? "Signing in…" : "Sign In"}
            disabled={pending}
            onPress={() => void onSubmit()}
          />

          <View style={styles.signUpRow}>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize + 1,
              }}
            >
              Don&apos;t have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up">
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontSize: tokens.type.bodySmall.fontSize + 1,
                  fontWeight: "700",
                }}
              >
                Create account
              </Text>
            </Link>
          </View>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  adornmentPress: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
