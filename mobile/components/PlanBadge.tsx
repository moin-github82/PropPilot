import { View, Text, StyleSheet } from 'react-native'
import { C } from '../lib/colours'
import type { UserPlan } from '../lib/auth'

export function PlanBadge({ plan }: { plan: UserPlan }) {
  const isPro = plan !== 'free'
  return (
    <View style={[s.badge, isPro ? s.pro : s.free]}>
      <Text style={[s.label, isPro ? s.proText : s.freeText]}>
        {plan.toUpperCase()}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  badge:   { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  label:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  free:    { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  freeText: { color: '#6b7280' },
  pro:     { backgroundColor: C.greenLight, borderColor: C.greenBorder },
  proText: { color: '#15803d' },
})
