import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { colors } from '@/theme';
import { employeeRepo } from '@/repositories/employeeRepo';
import { useStore } from '@/store/useStore';

const ROLES = ['PENJAHIT', 'CUTTING', 'FINISHING'];

export default function NewEmployeeScreen() {
  const router = useRouter();
  const reloadEmployees = useStore((s) => s.reloadEmployees);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('Perhatian', 'Nama tidak boleh kosong.');
    setSaving(true);
    try {
      await employeeRepo.create(name.trim(), phone.trim() || null, role);
      await reloadEmployees();
      router.back();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan karyawan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={ui.label}>Nama</Text>
      <TextInput style={ui.input} value={name} onChangeText={setName} placeholder="Nama karyawan" placeholderTextColor={colors.muted} />

      <Text style={ui.label}>No. HP</Text>
      <TextInput
        style={ui.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Opsional"
        placeholderTextColor={colors.muted}
      />

      <Text style={ui.label}>Peran</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {ROLES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={{
              borderWidth: 1,
              borderColor: role === r ? colors.primary : colors.border,
              backgroundColor: role === r ? colors.primary : colors.card,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: role === r ? colors.primaryText : colors.text }}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[ui.button, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        <Text style={ui.buttonText}>{saving ? 'Menyimpan...' : 'Simpan Karyawan'}</Text>
      </Pressable>
    </ScrollView>
  );
}
