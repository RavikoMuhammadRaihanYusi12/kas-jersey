import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ui } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { formatCurrency, todayISO } from '@/config/constants';
import { useStore } from '@/store/useStore';
import { processPieceRatePayroll, PayrollError } from '@/services/payrollEngine';
import { grossPay } from '@/services/payrollMath';
import { kasbonRepo } from '@/repositories/kasbonRepo';
import type { PieceRateItem } from '@/types';

const emptyLine = (): PieceRateItem => ({ modelDescription: '', qty: 0, ratePerPcs: 0 });

export default function PayrollScreen() {
  const router = useRouter();
  const employees = useStore((s) => s.employees);
  const jobModels = useStore((s) => s.jobModels);
  const categories = useStore((s) => s.categories);
  const reloadLedger = useStore((s) => s.reloadLedger);
  const reloadEmployees = useStore((s) => s.reloadEmployees);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [items, setItems] = useState<PieceRateItem[]>([emptyLine()]);
  const [deduction, setDeduction] = useState('');
  const [notes, setNotes] = useState('');
  const [kasbonRemaining, setKasbonRemaining] = useState(0);
  const [saving, setSaving] = useState(false);

  const gross = useMemo(() => grossPay(items.filter((i) => i.qty > 0 && i.modelDescription.trim())), [items]);
  const deductionValue = Number(deduction.replace(/[^\d]/g, '')) || 0;
  const net = gross - deductionValue;

  const loadKasbon = useCallback(async (id: number) => {
    setKasbonRemaining(await kasbonRepo.totalRemainingByEmployee(id));
  }, []);

  const pickEmployee = useCallback(
    (id: number) => {
      setEmployeeId(id);
      loadKasbon(id);
    },
    [loadKasbon],
  );

  const updateLine = (index: number, patch: Partial<PieceRateItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const applyPreset = (index: number, modelId: number) => {
    const model = jobModels.find((m) => m.id === modelId);
    if (model) updateLine(index, { modelDescription: model.model_name, ratePerPcs: model.default_rate });
  };

  const submit = async () => {
    if (employeeId == null) return Alert.alert('Perhatian', 'Pilih karyawan terlebih dahulu.');
    const clean = items.filter((i) => i.qty > 0 && i.modelDescription.trim());
    if (clean.length === 0) return Alert.alert('Perhatian', 'Isi minimal satu rincian pekerjaan.');

    const category = categories.find((c) => c.name === 'Upah Borongan Jahit') ?? categories.find((c) => c.type === 'EXPENSE');
    if (!category) return Alert.alert('Error', 'Kategori upah tidak ditemukan.');

    setSaving(true);
    try {
      const result = await processPieceRatePayroll({
        employeeId,
        categoryId: category.id,
        transactionDate: todayISO(),
        items: clean,
        kasbonDeduction: deductionValue,
        notes: notes.trim() || undefined,
      });
      await Promise.all([reloadLedger(), reloadEmployees()]);
      Alert.alert(
        'Tersimpan',
        `Upah kotor: ${formatCurrency(result.grossPay)}\nPotongan kasbon: ${formatCurrency(result.kasbonDeduction)}\nDibayar: ${formatCurrency(result.netPay)}`,
        [
          { text: 'Selesai', onPress: () => router.back() },
          {
            text: 'Bagikan Slip',
            onPress: async () => {
              try {
                const { buildPayrollSlipHtml } = await import('@/services/reportBuilder');
                const { sharePdfFromHtml } = await import('@/services/exportService');
                await sharePdfFromHtml(await buildPayrollSlipHtml(result.transactionId), `slip-${result.transactionId}.pdf`);
              } catch {
                Alert.alert('Gagal', 'Tidak dapat membuat slip PDF.');
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Gagal', e instanceof PayrollError ? e.message : 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.label}>Karyawan / Penjahit</Text>
      <View style={styles.chips}>
        {employees.length === 0 ? (
          <Text style={ui.muted}>Belum ada karyawan. Tambahkan dulu.</Text>
        ) : (
          employees.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => pickEmployee(e.id)}
              style={[styles.chip, employeeId === e.id && styles.chipActive]}
            >
              <Text style={employeeId === e.id ? styles.chipTextActive : styles.chipText}>{e.name}</Text>
            </Pressable>
          ))
        )}
      </View>

      {employeeId != null && (
        <Text style={ui.muted}>Sisa kasbon: {formatCurrency(kasbonRemaining)}</Text>
      )}

      <Text style={ui.h2}>Rincian Pekerjaan</Text>
      {items.map((item, index) => (
        <Card key={index} style={styles.lineCard}>
          <TextInput
            style={ui.input}
            placeholder="Model (mis. Lengan Panjang + Kerah Polo)"
            placeholderTextColor={colors.muted}
            value={item.modelDescription}
            onChangeText={(v) => updateLine(index, { modelDescription: v })}
          />
          {jobModels.length > 0 && (
            <View style={styles.chips}>
              {jobModels.map((m) => (
                <Pressable key={m.id} onPress={() => applyPreset(index, m.id)} style={styles.presetChip}>
                  <Text style={styles.presetText}>{m.model_name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={ui.label}>Qty (pcs)</Text>
              <TextInput
                style={ui.input}
                keyboardType="number-pad"
                value={item.qty ? String(item.qty) : ''}
                onChangeText={(v) => updateLine(index, { qty: Number(v.replace(/[^\d]/g, '')) || 0 })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ui.label}>Tarif / pcs</Text>
              <TextInput
                style={ui.input}
                keyboardType="number-pad"
                value={item.ratePerPcs ? String(item.ratePerPcs) : ''}
                onChangeText={(v) => updateLine(index, { ratePerPcs: Number(v.replace(/[^\d]/g, '')) || 0 })}
              />
            </View>
          </View>
          <View style={ui.spaced}>
            <Text style={ui.muted}>Subtotal: {formatCurrency(item.qty * item.ratePerPcs)}</Text>
            {items.length > 1 && (
              <Pressable onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))}>
                <Text style={[ui.link, { color: colors.danger }]}>Hapus</Text>
              </Pressable>
            )}
          </View>
        </Card>
      ))}

      <Pressable style={[ui.button, ui.buttonSecondary]} onPress={() => setItems((p) => [...p, emptyLine()])}>
        <Text style={ui.buttonTextSecondary}>+ Tambah Item</Text>
      </Pressable>

      <Text style={ui.label}>Potongan Kasbon (opsional)</Text>
      <TextInput
        style={ui.input}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.muted}
        value={deduction}
        onChangeText={setDeduction}
      />

      <Text style={ui.label}>Catatan</Text>
      <TextInput
        style={ui.input}
        placeholder="Opsional"
        placeholderTextColor={colors.muted}
        value={notes}
        onChangeText={setNotes}
      />

      <Card>
        <Row label="Total Upah Kotor" value={formatCurrency(gross)} />
        <Row label="Potongan Kasbon" value={`- ${formatCurrency(deductionValue)}`} />
        <Row label="Upah Bersih Dibayar" value={formatCurrency(net)} bold />
      </Card>

      <Pressable style={[ui.button, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        <Text style={ui.buttonText}>{saving ? 'Menyimpan...' : 'Simpan Pembayaran'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={[ui.spaced, { marginVertical: 2 }]}>
      <Text style={bold ? ui.h2 : ui.muted}>{label}</Text>
      <Text style={bold ? ui.h2 : ui.muted}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
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
  presetChip: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  presetText: { color: colors.muted, fontSize: 12 },
  lineCard: { gap: spacing.sm },
  lineRow: { flexDirection: 'row', gap: spacing.md },
});
