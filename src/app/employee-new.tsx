import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ui } from '@/components/ui';
import { colors } from '@/theme';
import { employeeRepo } from '@/repositories/employeeRepo';
import { useStore } from '@/store/useStore';

const ROLES = ['GUNTING', 'PRESS', 'DESAINER', 'PALUGADA', 'PENJAHIT', 'BENDAHARA'];

export default function NewEmployeeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const reloadEmployees = useStore((s) => s.reloadEmployees);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId == null) return;
    employeeRepo.get(editingId).then((e) => {
      if (!e) return;
      setName(e.name);
      setPhone(e.phone ?? '');
      setRole(e.role);
    });
  }, [editingId]);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('Perhatian', 'Nama tidak boleh kosong.');
    setSaving(true);
    try {
      if (editingId == null) {
        await employeeRepo.create(name.trim(), phone.trim() || null, role);
      } else {
        await employeeRepo.update(editingId, name.trim(), phone.trim() || null, role);
      }
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
        <Text style={ui.buttonText}>{saving ? 'Menyimpan...' : editingId == null ? 'Simpan Karyawan' : 'Perbarui Karyawan'}</Text>
      </Pressable>
    </ScrollView>
  );
}
