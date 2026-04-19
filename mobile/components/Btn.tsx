import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native'
import { C } from '../lib/colours'

type Variant = 'primary' | 'outline' | 'ghost' | 'dark'

interface Props {
  label:      string
  onPress:    () => void
  variant?:   Variant
  loading?:   boolean
  disabled?:  boolean
  style?:     ViewStyle
  fullWidth?: boolean
}

export function Btn({
  label, onPress, variant = 'primary', loading = false, disabled = false, style, fullWidth = true,
}: Props) {
  const vs = variants[variant]
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.base, vs.btn, fullWidth && s.full, (disabled || loading) && s.muted, style]}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={vs.text.color as string} size="small" />
        : <Text style={[s.label, vs.text]}>{label}</Text>}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  base:  { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  full:  { width: '100%' },
  muted: { opacity: 0.6 },
  label: { fontSize: 15, fontWeight: '600' },
})

const variants = {
  primary: {
    btn:  { backgroundColor: C.green },
    text: { color: '#fff' },
  },
  outline: {
    btn:  { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.green },
    text: { color: C.green },
  },
  ghost: {
    btn:  { backgroundColor: C.bg },
    text: { color: C.mid },
  },
  dark: {
    btn:  { backgroundColor: C.dark },
    text: { color: '#fff' },
  },
} as const
