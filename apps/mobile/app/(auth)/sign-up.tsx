import { useOAuth, useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter, type Href } from "expo-router";
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
import { writeSettings } from "@/lib/settings";

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
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
        router.replace("/onboarding/preferences");
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

  const handleGoogleSignUp = async () => {
    setSocialLoading(true);
    setError(null);
    try {
      const { createdSessionId, setActive: setOAuthActive } =
        await startGoogleOAuth({
          redirectUrl: Linking.createURL("/oauth-callback", {
            scheme: "afterbuy",
          }),
        });
      if (createdSessionId && setOAuthActive) {
        await markOnboardingPending();
        await setOAuthActive({ session: createdSessionId });
        router.replace("/onboarding/preferences");
        return;
      }
      setError("Google authentication was canceled or failed.");
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Google authentication was canceled or failed."
      );
    } finally {
      setSocialLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Ambient background glow */}
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
        <AuthHeroIllustration compact />

        {/* Heading */}
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Create your account
          </Text>
          <Text style={styles.subtitle}>
            {
              "Join AfterBuy and keep track of everything\nyou buy, effortlessly."
            }
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            density="compact"
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
            leadingIcon={
              <Ionicons name="person-outline" size={19} color="#64748B" />
            }
          />

          <Input
            ref={emailInputRef}
            density="compact"
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
            leadingIcon={
              <Ionicons name="mail-outline" size={19} color="#64748B" />
            }
          />

          <Input
            ref={passwordInputRef}
            density="compact"
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
            leadingIcon={
              <Ionicons name="lock-closed-outline" size={19} color="#64748B" />
            }
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
                  color="#64748B"
                />
              </Pressable>
            }
          />

          {/* Password Validation Checklist */}
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

          {/* Terms & Privacy Checkbox Card */}
          <View style={styles.termsCard}>
            <Pressable
              onPress={() => setAgreedTerms((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedTerms }}
              accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
              hitSlop={8}
              style={styles.checkboxTouch}
            >
              <View
                style={[styles.checkbox, agreedTerms && styles.checkboxActive]}
              >
                {agreedTerms ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : null}
              </View>
            </Pressable>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                onPress={() => router.push("/terms" as Href)}
                style={styles.inlineLink}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                onPress={() => router.push("/privacy" as Href)}
                style={styles.inlineLink}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          <FormError message={error} />

          {/* Primary Action Button */}
          <Button
            label={pending ? "Creating account..." : "Create account"}
            trailing={
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            }
            disabled={!isFormValid || pending || socialLoading}
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
          <SocialAuthButton
            provider="google"
            onPress={() => void handleGoogleSignUp()}
            loading={socialLoading}
            disabled={pending || socialLoading}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={10}>
              <Text style={styles.linkText}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name={ok ? "checkmark-circle" : "ellipse-outline"}
        size={15}
        color={ok ? "#10B981" : "#94A3B8"}
      />
      <Text style={[styles.checkText, ok && styles.checkTextActive]}>
        {label}
      </Text>
    </View>
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
    paddingBottom: 28,
  },
  topBar: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: 0,
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
    marginTop: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  form: {
    gap: 9,
  },
  adornmentPress: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  checkList: {
    gap: 4,
    marginTop: -1,
    marginBottom: 1,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  checkText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
    color: "#475569",
  },
  checkTextActive: {
    color: "#10B981",
  },
  termsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    marginTop: 1,
  },
  checkboxTouch: {
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    borderColor: "#775DF5",
    backgroundColor: "#775DF5",
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#334155",
    fontWeight: "500",
  },
  inlineLink: {
    color: "#775DF5",
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 4,
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
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  socialBlock: {
    gap: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    fontWeight: "500",
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#775DF5",
  },
});
