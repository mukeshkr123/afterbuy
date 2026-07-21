import { useSignUp } from "@clerk/clerk-expo";
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

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const { tokens } = useTheme();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Consent must be given, not assumed — this used to default to true.
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;

    const nextFieldErrors: Record<string, string> = {};
    if (!fullName.trim()) nextFieldErrors["fullName"] = "Enter your name.";
    if (!email.trim()) nextFieldErrors["email"] = "Enter your email.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextFieldErrors["password"] =
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError(null);
      return;
    }
    if (!agreedTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ");

      const result = await signUp.create({
        emailAddress: email.trim(),
        // The password is the one the user chose. It was previously derived
        // from the email address, which made every account's credentials
        // guessable by anyone who knew the address.
        password,
        firstName,
        ...(lastName ? { lastName } : {}),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        router.replace("/(auth)/verify");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-up failed");
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
            Create account
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.body.fontSize,
              lineHeight: tokens.type.body.lineHeight,
            }}
          >
            Let&apos;s get you started.
          </Text>
        </View>

        <View style={{ gap: tokens.spacing.lg }}>
          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            error={fieldErrors["fullName"]}
          />

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
            error={fieldErrors["email"]}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Choose a password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            error={fieldErrors["password"]}
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
            style={[styles.checkboxRow, { gap: tokens.spacing.md }]}
            onPress={() => setAgreedTerms((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedTerms }}
            accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
            hitSlop={6}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderRadius: tokens.radius.sm,
                  borderColor: agreedTerms
                    ? tokens.colors.accent
                    : tokens.colors.border,
                  backgroundColor: agreedTerms
                    ? tokens.colors.accent
                    : "transparent",
                },
              ]}
            >
              {agreedTerms ? (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={tokens.colors.accentText}
                />
              ) : null}
            </View>
            <Text
              style={{
                flex: 1,
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize,
                lineHeight: tokens.type.bodySmall.lineHeight,
              }}
            >
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </Pressable>

          <FormError message={error} />

          <Button
            label={pending ? "Creating account…" : "Continue"}
            disabled={pending}
            onPress={() => void onSubmit()}
          />

          <View style={styles.signInRow}>
            <Text
              style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.type.bodySmall.fontSize + 1,
              }}
            >
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in">
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontSize: tokens.type.bodySmall.fontSize + 1,
                  fontWeight: "700",
                }}
              >
                Sign in
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
