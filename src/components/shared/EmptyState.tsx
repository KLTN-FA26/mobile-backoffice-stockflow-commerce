import { Inbox, SearchX } from "lucide-react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { Button } from "@/components/ui";

import { StateLayout } from "./StateLayout";

export type EmptyStateNoDataProps = {
  title: string;
  description?: string;
  /** The way to create the first record; leave out when the user may not create one. */
  action?: { label: string; onPress: () => void };
};

export type EmptyStateNoResultsProps = {
  onClearFilters: () => void;
  title?: string;
};

/**
 * Empty because nothing exists yet. Not the same state as `EmptyStateNoResults` (nothing matches
 * the filters): pick by whether a filter is active, never merge the two.
 */
export function EmptyStateNoData({ title, description, action }: EmptyStateNoDataProps) {
  return (
    <StateLayout icon={Inbox} title={title} description={description}>
      {action === undefined ? null : <Button label={action.label} onPress={action.onPress} />}
    </StateLayout>
  );
}

/** Empty because the active filters match nothing; the way out is to clear them. */
export function EmptyStateNoResults({
  onClearFilters,
  title = MOBILE_LABELS.noResultsTitle,
}: EmptyStateNoResultsProps) {
  return (
    <StateLayout icon={SearchX} title={title}>
      <Button variant="secondary" label={MOBILE_LABELS.clearFilters} onPress={onClearFilters} />
    </StateLayout>
  );
}
