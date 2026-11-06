import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ui } from '@/components/ui';
import { Card } from '@/components/Card';
import { colors } from '@/theme';
import { formatCurrency, todayISO } from '@/config/constants';
import { ledgerRepo } from '@/repositories/ledgerRepo';
import { buildLedgerCsv, buildKasbonCsv } from '@/services/reportBuilder';
import { shareCsv } from '@/services/exportService';

const firstOfMonth = () => todayISO().slice(0, 8) + '01';

export default function ReportsScreen() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayISO());
  const [summary, setSummary] = useState<{ income: number; expense: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const runSummary = async () => {
    setBusy(true);
    try {
      setSummary(await ledgerRepo.summary(from, to));
    } catch {
      Alert.alert('Gagal', 'Periode tidak valid. Gunakan format YYYY-MM-DD.');
    } finally {
      setBusy(false);
    }
  };

  const exportLedger = async () => {
    try {
      await shareCsv(await buildLedgerCsv(from, to), `kas-${from}_${to}.csv`);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengekspor CSV.');
    }
  };

  const exportKasbon = async () => {
    try {
      await shareCsv(await buildKasbonCsv(), 'kasbon.csv');
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengekspor CSV.');
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.h1}>Laporan</Text>

      <Text style={ui.label}>Dari (YYYY-MM-DD)</Text>
      <TextInput style={ui.input} value={from} onChangeText={setFrom} autoCapitalize="none" />
      <Text style={ui.label}>Sampai (YYYY-MM-DD)</Text>
      <TextInput style={ui.input} value={to} onChangeText={setTo} autoCapitalize="none" />

      <Pressable style={[ui.button, busy && { opacity: 0.6 }]} onPress={runSummary} disabled={busy}>
        <Text style={ui.buttonText}>{busy ? 'Menghitung...' : 'Hitung Ringkasan'}</Text>
      </Pressable>

      {summary && (
        <Card>
          <Row label="Pemasukan" value={formatCurrency(summary.income)} color={colors.income} />
          <Row label="Pengeluaran" value={formatCurrency(summary.expense)} color={colors.expense} />
          <Row
            label="Selisih"
            value={formatCurrency(summary.income - summary.expense)}
            color={summary.income - summary.expense >= 0 ? colors.income : colors.expense}
          />
        </Card>
      )}

      <Text style={ui.h2}>Ekspor</Text>
      <Pressable style={[ui.button, ui.buttonSecondary]} onPress={exportLedger}>
        <Text style={ui.buttonTextSecondary}>Ekspor Kas (CSV)</Text>
      </Pressable>
      <Pressable style={[ui.button, ui.buttonSecondary]} onPress={exportKasbon}>
        <Text style={ui.buttonTextSecondary}>Ekspor Kasbon (CSV)</Text>
      </Pressable>
      <Text style={ui.muted}>
        Slip upah borongan (PDF) dapat dibagikan saat menyimpan pembayaran upah, atau nanti dari detail transaksi.
      </Text>
    </ScrollView>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={[ui.spaced, { marginVertical: 2 }]}>
      <Text style={ui.muted}>{label}</Text>
      <Text style={{ fontWeight: '700', color: color ?? colors.text }}>{value}</Text>
    </View>
  );
}
