import { StartRedirect } from "@/components/mobile/StartRedirect";

/** App start: the login when signed out, else the first hub this user can see. */
export default function Index() {
  return <StartRedirect />;
}
