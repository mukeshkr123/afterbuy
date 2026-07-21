import { useOAuth, useSignUp } from "@clerk/clerk-expo";
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

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const { tokens } = useTheme();

  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"apple" | "google" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const isFormValid =
    fullName.trim().length > 0 &&
    isValidEmail(email) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    agreedTerms;

  const handleSocialSignUp = async (
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

  const openLegalDocument = (title: string, content: string) => {
    Alert.alert(title, content);
  };

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;

    const nextFieldErrors: Record<string, string> = {};
    if (!fullName.trim()) nextFieldErrors["fullName"] = "Enter your full name.";
    if (!email.trim() || !isValidEmail(email)) {
      nextFieldErrors["email"] = "Enter a valid email address.";
    }
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
      setError(
        e instanceof Error
          ? e.message
          : "An account with this email already exists."
      );
    } finally {
      setPending(false);
    }
  };

  const getPasswordHint = () => {
    if (password.length === 0) {
      return "At least 8 characters.";
    }
    if (password.length >= MIN_PASSWORD_LENGTH) {
      return "Password meets requirement.";
    }
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
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

        {/* Heading & Supporting Copy */}
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
            Create your account
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: tokens.colors.textSubtle,
              },
            ]}
          >
            Keep your purchases, receipts, and protection details in one place.
          </Text>
        </View>

        {/* Social Authentication Section */}
        <View style={styles.socialBlock}>
          <SocialAuthButton
            provider="apple"
            onPress={() => void handleSocialSignUp("oauth_apple")}
            loading={socialLoading === "apple"}
            disabled={pending || socialLoading !== null}
          />
          <SocialAuthButton
            provider="google"
            onPress={() => void handleSocialSignUp("oauth_google")}
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

        {/* Form Fields */}
        <View style={styles.formBlock}>
          <Input
            label="Full name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (fieldErrors["fullName"]) {
                setFieldErrors((prev) => ({ ...prev, fullName: "" }));
              }
            }}
            placeholder="Your name"
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailInputRef.current?.focus()}
            error={fieldErrors["fullName"]}
          />

          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (fieldErrors["email"]) {
                setFieldErrors((prev) => ({ ...prev, email: "" }));
              }
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
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (fieldErrors["password"]) {
                setFieldErrors((prev) => ({ ...prev, password: "" }));
              }
            }}
            placeholder="Choose a password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
            hint={getPasswordHint()}
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

          {/* Terms & Privacy Agreement Row */}
          <View style={styles.termsRowContainer}>
            <Pressable
              onPress={() => setAgreedTerms((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedTerms }}
              accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
              hitSlop={8}
              style={styles.checkboxTouchable}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderRadius: 6,
                    borderColor: agreedTerms
                      ? tokens.colors.accent
                      : tokens.colors.border,
                    backgroundColor: agreedTerms
                      ? tokens.colors.accent
                      : "transparent",
                  },
                ]}
              >
                {agreedTerms && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={tokens.colors.accentText}
                  />
                )}
              </View>
            </Pressable>

            <Text
              style={[styles.termsText, { color: tokens.colors.textSubtle }]}
            >
              I agree to the{" "}
              <Text
                onPress={() =>
                  openLegalDocument(
                    "Terms of Service",
                    "By using AfterBuy, you agree to track and manage your purchase receipts, warranties, and deadline notifications responsibly."
                  )
                }
                style={[styles.legalLink, { color: tokens.colors.accent }]}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                onPress={() =>
                  openLegalDocument(
                    "Privacy Policy",
                    "AfterBuy encrypts your transaction receipts and personal credentials. We never sell your personal data."
                  )
                }
                style={[styles.legalLink, { color: tokens.colors.accent }]}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          <FormError message={error} />

          <Button
            label={pending ? "Creating account…" : "Create account"}
            disabled={!isFormValid || pending || socialLoading !== null}
            onPress={() => void onSubmit()}
          />

          <View style={styles.footerRow}>
            <Text
              style={[styles.footerText, { color: tokens.colors.textMuted }]}
            >
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable
                hitSlop={8}
                accessibilityRole="link"
                accessibilityLabel="Sign in to existing account"
                style={styles.footerLinkTouch}
              >
                <Text
                  style={[styles.footerLink, { color: tokens.colors.accent }]}
                >
                  Sign in
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
  adornmentPress: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  termsRowContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  checkboxTouchable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -10,
    marginLeft: -10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  legalLink: {
    fontWeight: "600",
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
    minHeight: 44,
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
