import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { EmptyState } from '@/components/Card';
import { colors, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/config/constants';
import { kasbonRepo, type KasbonWithEmployee } from '@/repositories/kasbonRepo';

const statusLabel: Record<string, string> = { UNPAID: 'Belum Bayar', PARTIAL: 'Sebagian', PAID: 'Lunas' };
const statusColor: Record<string, string> = { UNPAID: colors.expense, PARTIAL: '#d97706', PAID: colors.income };

export default function KasbonScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<KasbonWithEmployee[]>([]);

  const load = useCallback(async () => setRows(await kasbonRepo.all()), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={ui.screen}>
      <FlatList
        contentContainerStyle={ui.content}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EmptyState text="Belum ada kasbon." />}
        ListHeaderComponent={
          <Pressable style={ui.button} onPress={() => router.push('/kasbon-new')}>
            <Text style={ui.buttonText}>+ Kasbon Baru</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.h2}>{item.employee_name}</Text>
              <Text style={ui.muted}>{formatDate(item.date)}</Text>
              {item.notes ? <Text style={ui.muted}>{item.notes}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={ui.h2}>{formatCurrency(item.remaining_amount)}</Text>
              <Text style={{ color: statusColor[item.status], fontSize: 12, fontWeight: '600' }}>
                {statusLabel[item.status]}
              </Text>
              <Text style={ui.muted}>dari {formatCurrency(item.total_amount)}</Text>
            </View>
          </View>
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
