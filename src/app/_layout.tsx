import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import { colors, spacing } from '@/theme';

export default function RootLayout() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [init]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Gagal memuat database: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="payroll" options={{ presentation: 'modal', headerShown: true, title: 'Upah Borongan' }} />
        <Stack.Screen name="transaction" options={{ presentation: 'modal', headerShown: true, title: 'Transaksi Kas' }} />
        <Stack.Screen name="kasbon-new" options={{ presentation: 'modal', headerShown: true, title: 'Kasbon Baru' }} />
        <Stack.Screen name="employee-new" options={{ presentation: 'modal', headerShown: true, title: 'Karyawan Baru' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  error: { color: colors.expense, textAlign: 'center' },
});
