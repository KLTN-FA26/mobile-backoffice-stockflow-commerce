import { signIn } from "@/lib/auth/auth-session";

import { CredentialsForm } from "./CredentialsForm";

export type LoginFormProps = {
  /** Runs once the session is established (token stored, /me loaded). */
  onSignedIn: () => void;
};

/** The login screen's form: one `signIn` per tap, the web's error copy, a countdown when rate-limited. */
export function LoginForm({ onSignedIn }: LoginFormProps) {
  return <CredentialsForm submit={(input) => signIn(input)} onSuccess={onSignedIn} />;
}
