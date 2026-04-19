import { View, StyleSheet, type ViewProps } from 'react-native'
import { C } from '../lib/colours'

export function Card({ style, children, ...props }: ViewProps) {
  return (
    <View style={[s.card, style]} {...props}>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
})
