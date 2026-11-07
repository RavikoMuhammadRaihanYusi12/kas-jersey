import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { EmptyState } from '@/components/Card';
import { colors, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/config/constants';
import { useStore } from '@/store/useStore';
import { ledgerRepo, type LedgerRow } from '@/repositories/ledgerRepo';

export default function LedgerScreen() {
  const router = useRouter();
  const reloadLedger = useStore((s) => s.reloadLedger);
  const [rows, setRows] = useState<LedgerRow[]>([]);

  const load = useCallback(async () => {
    setRows(await ledgerRepo.list(200, 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = async (id: number) => {
    await ledgerRepo.remove(id);
    await Promise.all([load(), reloadLedger()]);
  };

  return (
    <View style={ui.screen}>
      <FlatList
        contentContainerStyle={ui.content}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EmptyState text="Belum ada transaksi." />}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            <Pressable style={ui.button} onPress={() => router.push('/transaction')}>
              <Text style={ui.buttonText}>+ Transaksi Baru</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onLongPress={() => remove(item.id)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.h2}>{item.category_name}</Text>
              <Text style={ui.muted}>
                {formatDate(item.transaction_date)}
                {item.employee_name ? ` · ${item.employee_name}` : ''}
              </Text>
              {item.description ? <Text style={ui.muted}>{item.description}</Text> : null}
            </View>
            <Text style={{ color: item.type === 'INCOME' ? colors.income : colors.expense, fontWeight: '700' }}>
              {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
});
