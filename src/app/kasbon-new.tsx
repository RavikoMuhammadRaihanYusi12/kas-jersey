import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { todayISO } from '@/config/constants';
import { kasbonRepo } from '@/repositories/kasbonRepo';
import { useStore } from '@/store/useStore';

export default function NewKasbonScreen() {
  const router = useRouter();
  const employees = useStore((s) => s.employees);
  const reloadEmployees = useStore((s) => s.reloadEmployees);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (employeeId == null) return Alert.alert('Perhatian', 'Pilih karyawan.');
    const value = Number(amount.replace(/[^\d]/g, '')) || 0;
    if (value <= 0) return Alert.alert('Perhatian', 'Jumlah harus lebih dari 0.');

    setSaving(true);
    try {
      await kasbonRepo.create(employeeId, todayISO(), value, notes.trim() || null);
      await reloadEmployees();
      router.back();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan kasbon.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.label}>Karyawan</Text>
      <View style={styles.chips}>
        {employees.length === 0 ? (
          <Text style={ui.muted}>Belum ada karyawan. Tambahkan di tab Kas.</Text>
        ) : (
          employees.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => setEmployeeId(e.id)}
              style={[styles.chip, employeeId === e.id && styles.chipActive]}
            >
              <Text style={employeeId === e.id ? styles.chipTextActive : styles.chipText}>{e.name}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Text style={ui.label}>Jumlah Kasbon (Rp)</Text>
      <TextInput
        style={ui.input}
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        placeholderTextColor={colors.muted}
      />

      <Text style={ui.label}>Catatan</Text>
      <TextInput
        style={ui.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="Opsional"
        placeholderTextColor={colors.muted}
      />

      <Pressable style={[ui.button, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        <Text style={ui.buttonText}>{saving ? 'Menyimpan...' : 'Simpan Kasbon'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
