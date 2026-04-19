import { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

function calcPremium(
  currentValue: number,
  longLeaseValue: number,
  groundRent: number,
  yearsRemaining: number,
): { premium: number; yf: number; grCapital: number; marjinCrossover: number } {
  // Simplified Leasehold Reform Act 1993 formula
  const defermentRate = 0.05
  const yf = 1 - Math.pow(1 + defermentRate, -yearsRemaining)
  const grCapital = (groundRent / defermentRate) * (1 - Math.pow(1 + defermentRate, -yearsRemaining))
  const relativityFactor = yearsRemaining >= 80 ? 0.97 : yearsRemaining >= 70 ? 0.93 : yearsRemaining >= 60 ? 0.87 : 0.79
  const diminution = longLeaseValue - currentValue * relativityFactor
  const premium = Math.max(0, diminution * 0.5 + grCapital)
  return { premium, yf, grCapital, marjinCrossover: currentValue * (1 - relativityFactor) }
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export default function LeaseExtensionScreen() {
  const [flatValue,    setFlatValue]    = useState('')
  const [freehold,     setFreehold]     = useState('')
  const [groundRent,   setGroundRent]   = useState('')
  const [yearsLeft,    setYearsLeft]    = useState('')
  const [result,       setResult]       = useState<ReturnType<typeof calcPremium> | null>(null)

  const calculate = () => {
    const fv = parseFloat(flatValue) || 0
    const fr = parseFloat(freehold)  || fv * 1.1
    const gr = parseFloat(groundRent) || 0
    const yr = parseFloat(yearsLeft) || 0
    if (!fv || !yr) return
    setResult(calcPremium(fv, fr, gr, yr))
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="Lease Extension" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>Estimate your lease extension premium under the Leasehold Reform Act 1993. Always get a formal valuation from a specialist solicitor.</Text>

        {yearsLeft && parseFloat(yearsLeft) < 80 && (
          <View style={s.warnBox}>
            <Text style={s.warnText}>⚠️  Leases under 80 years become significantly more expensive to extend (marriage value kicks in). Act sooner rather than later.</Text>
          </View>
        )}

        <Card style={{ marginBottom: 14 }}>
          <Text style={s.label}>Current flat value (£)</Text>
          <TextInput style={s.input} placeholder="e.g. 300000" placeholderTextColor={C.light} keyboardType="numeric" value={flatValue} onChangeText={setFlatValue} />

          <Text style={s.label}>Freehold value (£, optional)</Text>
          <TextInput style={s.input} placeholder="Defaults to flat value × 1.1" placeholderTextColor={C.light} keyboardType="numeric" value={freehold} onChangeText={setFreehold} />

          <Text style={s.label}>Annual ground rent (£)</Text>
          <TextInput style={s.input} placeholder="e.g. 250" placeholderTextColor={C.light} keyboardType="numeric" value={groundRent} onChangeText={setGroundRent} />

          <Text style={s.label}>Years remaining on lease</Text>
          <TextInput style={s.input} placeholder="e.g. 75" placeholderTextColor={C.light} keyboardType="numeric" value={yearsLeft} onChangeText={setYearsLeft} />

          <Btn label="Estimate premium" onPress={calculate} style={{ marginTop: 8 }} />
        </Card>

        {result && (
          <Card>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Estimated premium</Text>
              <Text style={s.totalValue}>{fmt(result.premium)}</Text>
            </View>
            <Text style={s.note}>Plus legal fees (typically £2,000–£5,000) and surveyor costs (£500–£1,500).</Text>
            <View style={s.divider} />
            {[
              ['Ground rent capitalisation', fmt(result.grCapital)],
              ['Diminution in value (est.)',  fmt(result.marjinCrossover)],
            ].map(([label, val]) => (
              <View key={label} style={s.bandRow}>
                <Text style={s.bandLabel}>{label}</Text>
                <Text style={s.bandTax}>{val}</Text>
              </View>
            ))}
            <Text style={s.disclaimer}>This is an estimate using simplified 1993 Act methodology. Professional valuations may differ significantly.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  scroll:     { flex: 1 },
  content:    { padding: 16, paddingBottom: 40 },
  intro:      { fontSize: 13, color: C.mid, lineHeight: 20, marginBottom: 14 },
  warnBox:    { backgroundColor: C.amberLight, borderWidth: 1, borderColor: C.amber, borderRadius: 10, padding: 12, marginBottom: 14 },
  warnText:   { fontSize: 12, color: '#92400e', lineHeight: 18 },
  label:      { fontSize: 12, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 10 },
  input:      { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.dark, backgroundColor: C.bg },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.dark },
  totalValue: { fontSize: 24, fontWeight: '800', color: C.green },
  note:       { fontSize: 12, color: C.mid, marginBottom: 12 },
  divider:    { height: 1, backgroundColor: '#f0ede8', marginVertical: 12 },
  bandRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  bandLabel:  { fontSize: 12, color: C.mid },
  bandTax:    { fontSize: 13, fontWeight: '700', color: C.dark },
  disclaimer: { fontSize: 11, color: C.light, marginTop: 12, lineHeight: 16 },
})
