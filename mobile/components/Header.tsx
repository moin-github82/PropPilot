import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { C } from '../lib/colours'

interface Props {
  title:        string
  showBack?:    boolean
  rightLabel?:  string
  onRight?:     () => void
}

export function Header({ title, showBack = false, rightLabel, onRight }: Props) {
  const router = useRouter()
  return (
    <View style={s.bar}>
      <View style={s.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={s.wordmark}>
          Prop<Text style={s.green}>Pilot</Text>
        </Text>
      </View>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {rightLabel ? (
        <TouchableOpacity onPress={onRight} hitSlop={12}>
          <Text style={s.right}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 60 }} />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 60,
  },
  backBtn: { marginRight: 2 },
  backArrow: { fontSize: 28, color: C.mid, lineHeight: 28 },
  wordmark: { fontSize: 16, fontWeight: '700', color: C.dark },
  green:    { color: C.green },
  title:    { fontSize: 14, fontWeight: '600', color: C.dark, flex: 1, textAlign: 'center' },
  right:    { fontSize: 13, color: C.green, fontWeight: '600', width: 60, textAlign: 'right' },
})
