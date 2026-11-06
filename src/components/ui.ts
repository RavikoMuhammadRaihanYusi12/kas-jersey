import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spaced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 22, fontWeight: '700', color: colors.text },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { color: colors.primaryText, fontWeight: '700', fontSize: 15 },
  buttonTextSecondary: { color: colors.text, fontWeight: '600', fontSize: 15 },
  buttonDanger: { backgroundColor: colors.danger },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13 },
});
