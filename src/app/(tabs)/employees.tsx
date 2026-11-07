import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { EmptyState } from '@/components/Card';
import { colors, spacing } from '@/theme';
import { employeeRepo } from '@/repositories/employeeRepo';
import { useStore } from '@/store/useStore';
import type { Employee } from '@/types';

export default function EmployeesScreen() {
  const router = useRouter();
  const reloadEmployees = useStore((s) => s.reloadEmployees);
  const [rows, setRows] = useState<Employee[]>([]);

  const load = useCallback(async () => {
    setRows(await employeeRepo.all(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleActive = (item: Employee) => {
    const action = item.is_active ? 'Nonaktifkan' : 'Aktifkan';
    Alert.alert(action, `${action} ${item.name}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: action,
        style: item.is_active ? 'destructive' : 'default',
        onPress: async () => {
          await employeeRepo.setActive(item.id, !item.is_active);
          await Promise.all([load(), reloadEmployees()]);
        },
      },
    ]);
  };

  return (
    <View style={ui.screen}>
      <FlatList
        contentContainerStyle={ui.content}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EmptyState text="Belum ada karyawan." />}
        ListHeaderComponent={
          <Pressable style={ui.button} onPress={() => router.push('/employee-new')}>
            <Text style={ui.buttonText}>+ Karyawan Baru</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/employee-new', params: { id: String(item.id) } })}
            onLongPress={() => toggleActive(item)}
            style={[styles.row, !item.is_active && styles.inactive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.h2}>{item.name}</Text>
              <Text style={ui.muted}>
                {item.role}
                {item.phone ? ` · ${item.phone}` : ''}
                {item.is_active ? '' : ' · NONAKTIF'}
              </Text>
            </View>
            <Text style={ui.link}>Ubah</Text>
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
  inactive: { opacity: 0.5 },
});
