import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";

import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";

import { reauthenticate, signOut } from "@/lib/auth/auth-session";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useSessionExpiry } from "@/lib/auth/use-session-expiry";

import { Button, Sheet, Text } from "@/components/ui";

import { CredentialsForm } from "./CredentialsForm";

import type { ReauthOutcome } from "@/lib/auth/auth-session";
import type { ReactNode } from "react";

export type ReloginSheetProps = {
  /** The screens of the signed-in area. They stay mounted under the sheet, unsaved work included. */
  children: ReactNode;
  /** The user asked to sign in again before the session ran out (the expiry banner's button). */
  requested?: boolean;
  /** That request is over: the user signed in again or swiped the sheet away. */
  onRequestHandled?: () => void;
};

/**
 * Signing in again over an expired session (N8): the token cannot be refreshed, so a 401 or the
 * clock opens this sheet on top of the current screen instead of leaving it. It cannot be swiped
 * away then; the user signs in again or signs out. The same user carries on where they were, every
 * screen and draft intact. Someone else gets a fresh signed-in area from the start route: replacing
 * the root route drops the whole signed-in navigator, so none of the previous user's screens stay
 * mounted or reachable with Back.
 */
export function ReloginSheet({ children, requested = false, onRequestHandled }: ReloginSheetProps) {
  const queryClient = useQueryClient();
  const expired = useAuthStore((state) => state.sessionExpired);
  const [pending, setPending] = useState(false);
  // The sheet owns the clock: at `expiresAt` this marks the session expired, which opens it.
  useSessionExpiry();

  const handleSuccess = (outcome: ReauthOutcome) => {
    onRequestHandled?.();
    // The start route sends the new user to the first hub they can see.
    if (outcome === "switched-user") router.replace(MOBILE_ROUTES.start);
  };

  return (
    <>
      {children}
      <Sheet
        open={expired || requested}
        onOpenChange={(open) => {
          if (!open) onRequestHandled?.();
        }}
        title={expired ? MOBILE_LABELS.relogin.title : MOBILE_LABELS.sessionExpiry.action}
        dismissible={!expired && !pending}
        scrollable
      >
        <Text variant="meta" tone="secondary">
          {MOBILE_LABELS.relogin.description}
        </Text>
        <CredentialsForm
          submit={(input) => reauthenticate(input, queryClient)}
          onSuccess={handleSuccess}
          onPendingChange={setPending}
        />
        {/* R21: no sign-out while a re-login runs, or the re-login could bring the session back. */}
        <Button
          variant="ghost"
          label={MOBILE_LABELS.relogin.signOut}
          disabled={pending}
          onPress={() => void signOut(queryClient)}
        />
      </Sheet>
    </>
  );
}
