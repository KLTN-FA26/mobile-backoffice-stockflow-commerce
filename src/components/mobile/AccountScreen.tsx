import { ScrollView, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";
import { WAREHOUSE_PERMISSIONS } from "@/constants/permissions";

import { Can } from "@/lib/auth/components/Can";

import { ScreenHeader } from "./ScreenHeader";
import { AppearanceSection } from "./account/AppearanceSection";
import { DefaultWarehouseSection } from "./account/DefaultWarehouseSection";
import { IdentityCard } from "./account/IdentityCard";
import { ScanCheckSection } from "./account/ScanCheckSection";
import { ScanPrefsCard } from "./account/ScanPrefsCard";
import { SessionInfoCard } from "./account/SessionInfoCard";
import { SignOutButton } from "./account/SignOutButton";

/**
 * The account tab: who is signed in, the preferences that outlive the app (default warehouse,
 * theme, scan sound and vibration), a scan check for the device, the session and the build, and
 * sign out.
 */
export function AccountScreen() {
  return (
    <View className="flex-1 bg-bg-base">
      <ScreenHeader title={MOBILE_LABELS.account.title} />
      {/* "handled": with the scan check focused, the clear and camera buttons work on the first tap. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-[16px] p-[16px]"
      >
        <IdentityCard />
        {/* UI-only: Backend phải re-check warehouse-warehouses:READ on GET /warehouses. */}
        <Can permission={WAREHOUSE_PERMISSIONS.read}>
          <DefaultWarehouseSection />
        </Can>
        <AppearanceSection />
        <ScanPrefsCard />
        <ScanCheckSection />
        <SessionInfoCard />
        <SignOutButton />
      </ScrollView>
    </View>
  );
}
