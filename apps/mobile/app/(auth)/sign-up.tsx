import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter, type Href } from "expo-router";
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
} from "@/components";
import { writeSettings } from "@/lib/settings";
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
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const passwordChecks = {
    length: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isFormValid =
    fullName.trim().length > 0 &&
    isValidEmail(email) &&
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    agreedTerms;

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const markOnboardingPending = () =>
    writeSettings({
      authOnboardingPending: true,
      authOnboardingCompletedAt: null,
    });

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;
    const nextFieldErrors: Record<string, string> = {};
    if (!fullName.trim()) nextFieldErrors["fullName"] = "Enter your full name.";
    if (!email.trim() || !isValidEmail(email)) {
      nextFieldErrors["email"] = "Enter a valid email address.";
    }
    if (
      !passwordChecks.length ||
      !passwordChecks.uppercase ||
      !passwordChecks.number
    ) {
      nextFieldErrors["password"] = "Use a stronger password.";
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
        password,
        firstName,
        ...(lastName ? { lastName } : {}),
      });

      await markOnboardingPending();
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/onboarding/permissions");
      } else {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        router.replace("/(auth)/verify");
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "An account with this email already exists."
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
            Create your account
          </Text>
          <Text style={[styles.subtitle, { color: tokens.colors.textSubtle }]}>
            Let&apos;s get you started.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              clearFieldError("fullName");
            }}
            placeholder="Alex Kim"
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailInputRef.current?.focus()}
            error={fieldErrors["fullName"]}
          />

          <Input
            ref={emailInputRef}
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearFieldError("email");
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            error={fieldErrors["email"]}
          />

          <Input
            ref={passwordInputRef}
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearFieldError("password");
            }}
            placeholder="Create a strong password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
            error={fieldErrors["password"]}
            adornment={
              <Pressable
                onPress={() => setShowPassword((value) => !value)}
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

          <View style={styles.checkList}>
            <PasswordCheck
              ok={passwordChecks.length}
              label="At least 8 characters"
            />
            <PasswordCheck
              ok={passwordChecks.uppercase}
              label="One uppercase letter"
            />
            <PasswordCheck ok={passwordChecks.number} label="One number" />
          </View>

          <View style={styles.termsRow}>
            <Pressable
              onPress={() => setAgreedTerms((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedTerms }}
              accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
              hitSlop={8}
              style={styles.checkboxTouch}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: agreedTerms
                      ? tokens.colors.accent
                      : tokens.colors.outline,
                    backgroundColor: agreedTerms
                      ? tokens.colors.accent
                      : tokens.colors.surface,
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
            </Pressable>
            <Text
              style={[styles.termsText, { color: tokens.colors.textSubtle }]}
            >
              I agree to the{" "}
              <Text
                onPress={() => router.push("/terms" as Href)}
                style={[styles.inlineLink, { color: tokens.colors.accent }]}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                onPress={() => router.push("/privacy" as Href)}
                style={[styles.inlineLink, { color: tokens.colors.accent }]}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          <FormError message={error} />

          <Button
            label={pending ? "Creating account..." : "Create account"}
            disabled={!isFormValid || pending}
            busy={pending}
            size="lg"
            onPress={() => void onSubmit()}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: tokens.colors.textMuted }]}>
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={10}>
              <Text style={[styles.linkText, { color: tokens.colors.accent }]}>
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={17}
        color={ok ? tokens.colors.success : tokens.colors.outline}
      />
      <Text
        style={[
          styles.checkText,
          { color: ok ? tokens.colors.successText : tokens.colors.textSubtle },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    paddingBottom: 32,
  },
  heading: { gap: 6, marginTop: 8, marginBottom: 4 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  form: { gap: 13 },
  adornmentPress: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  checkList: { gap: 7, marginTop: -4 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkText: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 2,
  },
  checkboxTouch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
    marginTop: -8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },
  inlineLink: { fontWeight: "800" },
  footerRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
});
