import { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function MetricCard({ label, value, tone }: { label: string; value: string; tone?: 'income' | 'expense' }) {
  const valueColor = tone === 'income' ? colors.income : tone === 'expense' ? colors.expense : colors.text;
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </Card>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  metric: { flex: 1, minWidth: 140 },
  metricLabel: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs },
  metricValue: { fontSize: 20, fontWeight: '700' },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
