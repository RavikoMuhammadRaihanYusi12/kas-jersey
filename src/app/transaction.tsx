import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { todayISO } from '@/config/constants';
import { ledgerRepo } from '@/repositories/ledgerRepo';
import { useStore } from '@/store/useStore';
import type { TxType } from '@/types';

export default function TransactionScreen() {
  const router = useRouter();
  const categories = useStore((s) => s.categories);
  const employees = useStore((s) => s.employees);
  const reloadLedger = useStore((s) => s.reloadLedger);

  const [type, setType] = useState<TxType>('EXPENSE');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = categories.filter((c) => c.type === type);

  const submit = async () => {
    const value = Number(amount.replace(/[^\d]/g, '')) || 0;
    if (value <= 0) return Alert.alert('Perhatian', 'Jumlah harus lebih dari 0.');
    const cat = categoryId ?? visible[0]?.id;
    if (!cat) return Alert.alert('Perhatian', 'Pilih kategori.');

    setSaving(true);
    try {
      await ledgerRepo.create({
        transactionDate: todayISO(),
        type,
        categoryId: cat,
        amount: value,
        description: description.trim() || null,
        employeeId,
      });
      await reloadLedger();
      router.back();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan transaksi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <View style={styles.toggle}>
        {(['INCOME', 'EXPENSE'] as TxType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setType(t);
              setCategoryId(null);
            }}
            style={[styles.toggleBtn, type === t && styles.toggleActive]}
          >
            <Text style={type === t ? styles.toggleTextActive : styles.toggleText}>
              {t === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.label}>Kategori</Text>
      <View style={styles.chips}>
        {visible.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[styles.chip, (categoryId ?? visible[0]?.id) === c.id && styles.chipActive]}
          >
            <Text
              style={(categoryId ?? visible[0]?.id) === c.id ? styles.chipTextActive : styles.chipText}
            >
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.label}>Jumlah (Rp)</Text>
      <TextInput
        style={ui.input}
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        placeholderTextColor={colors.muted}
      />

      <Text style={ui.label}>Deskripsi</Text>
      <TextInput
        style={ui.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Opsional"
        placeholderTextColor={colors.muted}
      />

      <Text style={ui.label}>Karyawan (opsional)</Text>
      <View style={styles.chips}>
        <Pressable onPress={() => setEmployeeId(null)} style={[styles.chip, employeeId === null && styles.chipActive]}>
          <Text style={employeeId === null ? styles.chipTextActive : styles.chipText}>-</Text>
        </Pressable>
        {employees.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setEmployeeId(e.id)}
            style={[styles.chip, employeeId === e.id && styles.chipActive]}
          >
            <Text style={employeeId === e.id ? styles.chipTextActive : styles.chipText}>{e.name}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[ui.button, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        <Text style={ui.buttonText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.text, fontWeight: '600' },
  toggleTextActive: { color: colors.primaryText, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: colors.primaryText, fontSize: 14, fontWeight: '600' },
});
