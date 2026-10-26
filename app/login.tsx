import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";

import { LoginForm } from "@/components/mobile/LoginForm";
import { Text } from "@/components/ui";

export default function LoginRoute() {
  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-[24px] p-[16px]"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-[4px]">
            <Text variant="meta" tone="secondary">
              {MOBILE_LABELS.appName}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {MOBILE_LABELS.login.title}
            </Text>
          </View>
          {/* Home decides where a signed-in user starts (Expo Router's sign-in pattern). */}
          <LoginForm onSignedIn={() => router.replace(MOBILE_ROUTES.start)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
