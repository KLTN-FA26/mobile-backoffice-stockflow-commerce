import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useCountdown } from "@/hooks/use-countdown";
import { ApiError } from "@/lib/api/error";
import { getRetryAfterSeconds } from "@/lib/api/retry-after";
import { loginRequestSchema } from "@/lib/auth/auth-schemas";
import { loginErrorMessage } from "@/lib/auth/login-error";

import { Button, Input } from "@/components/ui";

import { LoginErrorAlert } from "./LoginErrorAlert";
import { PasswordField } from "./PasswordField";

import type { LoginErrorCode } from "@/constants/auth";
import type { LoginRequest } from "@/lib/auth/auth-schemas";
import type { TextInputInstance } from "react-native";

const RATE_LIMITED: LoginErrorCode = "RATE_LIMITED";
const EMPTY: LoginRequest = { username: "", password: "" };

/** How long the backend asked to wait, when it turned the attempt away for too many tries. */
function lockSeconds(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== RATE_LIMITED) return null;
  return getRetryAfterSeconds(error);
}

export type CredentialsFormProps<T> = {
  /** Sends the trimmed credentials (`loginRequestSchema`); a rejection is shown under the fields. */
  submit: (input: LoginRequest) => Promise<T>;
  onSuccess: (result: T) => void;
  onPendingChange?: (pending: boolean) => void;
};

/**
 * Username, password and the submit button, shared by the login screen and the re-login sheet.
 * Errors use the web's login copy (`loginErrorMessage`), keyed by the error code only.
 */
export function CredentialsForm<T>({
  submit,
  onSuccess,
  onPendingChange,
}: CredentialsFormProps<T>) {
  const { control, handleSubmit, formState } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: EMPTY,
    mode: "onChange",
  });
  const inFlight = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useCountdown();

  const finish = () => {
    inFlight.current = false;
    setPending(false);
    onPendingChange?.(false);
  };

  const send = async (input: LoginRequest) => {
    setError(null);
    setPending(true);
    onPendingChange?.(true);
    let result: T;
    try {
      result = await submit(input);
    } catch (failure: unknown) {
      finish();
      setError(loginErrorMessage(failure));
      const seconds = lockSeconds(failure);
      if (seconds !== null && seconds > 0) lock.start(seconds);
      return;
    }
    finish();
    // Outside the try: a throw from here on (navigation) is not a failed login.
    onSuccess(result);
  };

  const onSubmit = () => {
    // A second tap can land before the re-render that disables the button: the ref stops it.
    if (inFlight.current || lock.seconds > 0) return;
    inFlight.current = true;
    handleSubmit(send, () => {
      inFlight.current = false;
    })().catch((error: unknown) => {
      // Only a throw after a successful sign-in reaches this (send handles failed requests).
      console.error("Signed in, but the next step failed", error);
    });
  };

  return (
    <View className="gap-[16px]">
      <Controller
        control={control}
        name="username"
        render={({ field }) => (
          <Input
            label={MOBILE_LABELS.login.username}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <PasswordField
            ref={passwordRef}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />
      {error === null ? null : <LoginErrorAlert message={error} />}
      <Button
        size="lg"
        label={
          lock.seconds > 0 ? MOBILE_LABELS.login.retryIn(lock.seconds) : MOBILE_LABELS.login.submit
        }
        loading={pending}
        disabled={!formState.isValid || lock.seconds > 0}
        onPress={onSubmit}
      />
    </View>
  );
}
