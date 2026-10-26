import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { MOBILE_LABELS } from "@/constants/mobile";

import { signOut } from "@/lib/auth/auth-session";

import { ConfirmSheet } from "@/components/shared";
import { Button } from "@/components/ui";

const { account } = MOBILE_LABELS;

/**
 * Sign out, behind a confirmation. The sign-out is local-first (token, session data and cache go
 * first, the backend is told afterwards), so the confirm button spins only briefly; the gate then
 * leaves the tab, and with it the sheet.
 */
export function SignOutButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const confirm = async () => {
    setSigningOut(true);
    try {
      await signOut(queryClient);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <Button variant="secondary" label={account.signOut} onPress={() => setOpen(true)} />
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title={account.signOut}
        description={account.signOutConfirm}
        confirmLabel={account.signOut}
        // Signing out loses nothing (local-first, no unsaved work on this screen): not "danger".
        variant="default"
        loading={signingOut}
        // The sheet stays up until the sign-out is done and the screen goes away with it.
        closeOnConfirm={false}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
