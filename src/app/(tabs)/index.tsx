import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MetricCard, Card } from '@/components/Card';
import { ui } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { formatCurrency } from '@/config/constants';
import { dashboardStats } from '@/store/useStore';

interface Stats {
  summary: { income: number; expense: number };
  balance: number;
  topCategories: { category_name: string; type: string; total: number }[];
  outstandingKasbon: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      dashboardStats().then(setStats).catch(() => setStats(null));
    }, []),
  );

  const net = stats ? stats.summary.income - stats.summary.expense : 0;

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.h1}>Ringkasan Bulan Ini</Text>
      <View style={styles.grid}>
        <MetricCard label="Pemasukan" value={formatCurrency(stats?.summary.income ?? 0)} tone="income" />
        <MetricCard label="Pengeluaran" value={formatCurrency(stats?.summary.expense ?? 0)} tone="expense" />
        <MetricCard label="Selisih" value={formatCurrency(net)} tone={net >= 0 ? 'income' : 'expense'} />
        <MetricCard label="Saldo Kas" value={formatCurrency(stats?.balance ?? 0)} />
        <MetricCard label="Kasbon Aktif" value={formatCurrency(stats?.outstandingKasbon ?? 0)} />
      </View>

      <View style={styles.actions}>
        <ActionButton label="+ Upah Borongan" primary onPress={() => router.push('/payroll')} />
        <ActionButton label="+ Transaksi Kas" onPress={() => router.push('/transaction')} />
        <ActionButton label="+ Kasbon" onPress={() => router.push('/kasbon-new')} />
      </View>

      <Text style={ui.h2}>Pengeluaran Teratas</Text>
      {stats && stats.topCategories.length > 0 ? (
        stats.topCategories.slice(0, 5).map((c) => (
          <Card key={c.category_name} style={styles.catRow}>
            <Text style={ui.h2}>{c.category_name}</Text>
            <Text style={{ color: c.type === 'INCOME' ? colors.income : colors.expense, fontWeight: '700' }}>
              {formatCurrency(c.total)}
            </Text>
          </Card>
        ))
      ) : (
        <Text style={ui.muted}>Belum ada transaksi bulan ini.</Text>
      )}
    </ScrollView>
  );
}

function ActionButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Text onPress={onPress} style={[styles.action, primary && styles.actionPrimary]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  action: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontWeight: '600',
    color: colors.text,
    overflow: 'hidden',
  },
  actionPrimary: { backgroundColor: colors.primary, color: colors.primaryText, borderColor: colors.primary },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
});
