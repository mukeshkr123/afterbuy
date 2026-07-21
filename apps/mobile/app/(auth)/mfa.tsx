import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Button,
  FormError,
  Input,
  ScreenHeader,
  ScreenScroll,
  SectionCard,
} from "@/components";
import { useTheme } from "@/theme/ThemeProvider";

const CODE_LENGTH = 6;

export default function MfaScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { tokens } = useTheme();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || !signIn) return;
    setPending(true);
    setError(null);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
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
            router.canGoBack()
              ? router.back()
              : router.replace("/(auth)/sign-in")
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
            Two-step verification
          </Text>
          <Text
            style={{
              color: tokens.colors.textMuted,
              fontSize: tokens.type.body.fontSize,
              lineHeight: tokens.type.body.lineHeight,
            }}
          >
            We sent a {CODE_LENGTH}-digit code to your email address.
          </Text>
        </View>

        <SectionCard>
          <View style={{ gap: tokens.spacing.lg }}>
            <Input
              label="Verification code"
              value={code}
              // Strip non-digits so a pasted "123 456" still submits.
              onChangeText={(next) =>
                setCode(next.replace(/\D/g, "").slice(0, CODE_LENGTH))
              }
              keyboardType="number-pad"
              autoCapitalize="none"
              placeholder="123456"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
            <FormError message={error} />
            <Button
              label={pending ? "Verifying…" : "Verify"}
              onPress={() => void onSubmit()}
              disabled={pending || code.length < CODE_LENGTH}
            />
          </View>
        </SectionCard>
      </ScreenScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: "800",
    letterSpacing: -0.8,
  },
});
