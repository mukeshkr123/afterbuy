import { useSignIn } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Button,
  FormError,
  IconTile,
  Input,
  ScreenHeader,
  ScreenScroll,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { tokens } = useTheme();
  const [email, setEmail] = useState(params.email ?? "");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to send a reset link.");
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
            router.canGoBack()
              ? router.back()
              : router.replace("/(auth)/sign-in")
          }
        />

        <View style={styles.heading}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: tokens.colors.textStrong }]}
          >
            Forgot password?
          </Text>
          <Text style={[styles.subtitle, { color: tokens.colors.textSubtle }]}>
            No worries. Enter your email and we&apos;ll send you reset
            instructions.
          </Text>
        </View>

        <Input
          label="Email"
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            setSent(false);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => void onSubmit()}
        />

        <FormError message={error} />

        <Button
          label={
            pending ? "Sending..." : sent ? "Send again" : "Send reset link"
          }
          disabled={pending}
          busy={pending}
          size="lg"
          onPress={() => void onSubmit()}
        />

        <View style={{ flex: 1 }} />

        <View
          style={[
            styles.confirmPanel,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.xl,
            },
          ]}
        >
          <IconTile icon="mail-outline" tone="accent" size="lg" />
          <Text
            style={[styles.panelTitle, { color: tokens.colors.textStrong }]}
          >
            {sent ? "Check your email" : "We'll email you"}
          </Text>
          <Text style={[styles.panelCopy, { color: tokens.colors.textSubtle }]}>
            {sent
              ? `Instructions were sent to ${email.trim()}.`
              : "Instructions to reset your password will arrive there."}
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/sign-in")}
            accessibilityRole="link"
            hitSlop={12}
            style={styles.returnLink}
          >
            <Text style={[styles.linkText, { color: tokens.colors.accent }]}>
              Return to sign in
            </Text>
          </Pressable>
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
    minHeight: "100%",
    paddingBottom: 28,
  },
  heading: { gap: 7, marginTop: 12, marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: "500", maxWidth: 340 },
  confirmPanel: {
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  panelTitle: { marginTop: 6, fontSize: 17, lineHeight: 24, fontWeight: "800" },
  panelCopy: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  returnLink: { minHeight: 36, justifyContent: "center" },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
});
