// Dev-only diagnostic screen: React Native core components are used directly because the UI
// primitives in @/components/ui do not exist yet and this screen never ships to users.
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { INTL_PROBE_LABELS } from "@/constants/mobile";

import { runIntlProbe } from "@/lib/format/intl-probe";

import type { IntlProbeResult } from "@/lib/format/intl-probe";
import type { TextStyle } from "react-native";

const MAX_FONT_SCALE = 1.3;

function ProbeText({ children, style }: { children: string; style?: TextStyle }) {
  return (
    <Text selectable maxFontSizeMultiplier={MAX_FONT_SCALE} style={style}>
      {children}
    </Text>
  );
}

function ProbeRow({ result }: { result: IntlProbeResult }) {
  return (
    <View style={[styles.row, !result.ok && styles.rowMismatch]}>
      <View style={styles.rowHeader}>
        <ProbeText style={styles.name}>{result.name}</ProbeText>
        <ProbeText style={styles.status}>
          {result.ok ? INTL_PROBE_LABELS.ok : INTL_PROBE_LABELS.mismatch}
        </ProbeText>
      </View>
      <ProbeText>{`${INTL_PROBE_LABELS.actual}: "${result.actual}"`}</ProbeText>
      <ProbeText>{`${INTL_PROBE_LABELS.expected}: "${result.expected}"`}</ProbeText>
    </View>
  );
}

export function IntlProbeScreen() {
  const [results] = useState(() => runIntlProbe());
  const okCount = results.filter((result) => result.ok).length;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProbeText style={styles.title}>{INTL_PROBE_LABELS.title}</ProbeText>
        <ProbeText>{`${Platform.OS} ${String(Platform.Version)}`}</ProbeText>
        <ProbeText>{`${okCount}/${results.length} ${INTL_PROBE_LABELS.ok}`}</ProbeText>
        <ProbeText>{INTL_PROBE_LABELS.hint}</ProbeText>
        {results.map((result) => (
          <ProbeRow key={result.name} result={result} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  row: { gap: 4, padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  rowMismatch: { borderWidth: 2 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { flexShrink: 1, fontWeight: "600" },
  status: { fontWeight: "700" },
});
