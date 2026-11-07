import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: 'Kas',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="kasbon"
        options={{
          title: 'Kasbon',
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Karyawan',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
