import { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, Switch, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

function calcSDLT(price: number, isFTB: boolean, isAdditional: boolean): { total: number; bands: { label: string; rate: string; tax: number }[] } {
  if (isAdditional) {
    const bands = [
      { limit: 250000,  rate: 0.03, label: 'Up to £250,000' },
      { limit: 925000,  rate: 0.08, label: '£250,001–£925,000' },
      { limit: 1500000, rate: 0.13, label: '£925,001–£1.5m' },
      { limit: Infinity, rate: 0.15, label: 'Over £1.5m' },
    ]
    return calcBands(price, bands)
  }
  if (isFTB && price <= 625000) {
    const bands = [
      { limit: 425000,  rate: 0.00, label: 'Up to £425,000 (FTB relief)' },
      { limit: 625000,  rate: 0.05, label: '£425,001–£625,000' },
    ]
    return calcBands(price, bands)
  }
  const bands = [
    { limit: 250000,  rate: 0.00, label: 'Up to £250,000' },
    { limit: 925000,  rate: 0.05, label: '£250,001–£925,000' },
    { limit: 1500000, rate: 0.10, label: '£925,001–£1.5m' },
    { limit: Infinity, rate: 0.12, label: 'Over £1.5m' },
  ]
  return calcBands(price, bands)
}

function calcBands(price: number, bands: { limit: number; rate: number; label: string }[]) {
  let remaining = price
  let total     = 0
  const result  = []
  let prev      = 0
  for (const band of bands) {
    const taxable = Math.min(remaining, band.limit - prev)
    if (taxable <= 0) break
    const tax = taxable * band.rate
    total += tax
    result.push({ label: band.label, rate: `${(band.rate * 100).toFixed(0)}%`, tax })
    remaining -= taxable
    prev = band.limit
  }
  return { total, bands: result }
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export default function StampDutyScreen() {
  const [price,      setPrice]      = useState('')
  const [isFTB,      setIsFTB]      = useState(false)
  const [isAdditional, setIsAdditional] = useState(false)
  const [result,     setResult]     = useState<ReturnType<typeof calcSDLT> | null>(null)

  const calculate = () => {
    const p = parseFloat(price.replace(/[£,]/g, ''))
    if (!p || p < 1) return
    setResult(calcSDLT(p, isFTB, isAdditional))
  }

  const pct = result && parseFloat(price.replace(/[£,]/g, ''))
    ? ((result.total / parseFloat(price.replace(/[£,]/g, ''))) * 100).toFixed(2)
    : null

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="Stamp Duty" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.intro}>Calculate your SDLT bill including first-time buyer relief and the 3% additional-property surcharge.</Text>

        <Card style={{ marginBottom: 14 }}>
          <Text style={s.label}>Property price</Text>
          <TextInput
            style={s.input} placeholder="e.g. 350000"
            placeholderTextColor={C.light} keyboardType="numeric"
            value={price} onChangeText={setPrice}
          />

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>First-time buyer</Text>
              <Text style={s.toggleSub}>Relief up to £425k on properties ≤ £625k</Text>
            </View>
            <Switch value={isFTB} onValueChange={v => { setIsFTB(v); if (v) setIsAdditional(false) }} trackColor={{ true: C.green }} />
          </View>

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Additional property</Text>
              <Text style={s.toggleSub}>Second home or buy-to-let (+3% surcharge)</Text>
            </View>
            <Switch value={isAdditional} onValueChange={v => { setIsAdditional(v); if (v) setIsFTB(false) }} trackColor={{ true: C.green }} />
          </View>

          <Btn label="Calculate" onPress={calculate} style={{ marginTop: 8 }} />
        </Card>

        {result && (
          <Card>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total SDLT</Text>
              <Text style={s.totalValue}>{fmt(result.total)}</Text>
            </View>
            {pct && <Text style={s.totalPct}>Effective rate: {pct}%</Text>}
            <View style={s.divider} />
            {result.bands.map(b => (
              <View key={b.label} style={s.bandRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bandLabel}>{b.label}</Text>
                  <Text style={s.bandRate}>{b.rate}</Text>
                </View>
                <Text style={s.bandTax}>{fmt(b.tax)}</Text>
              </View>
            ))}
            <Text style={s.disclaimer}>Rates effective from October 2024. This calculator is for guidance only.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  content:     { padding: 16, paddingBottom: 40 },
  intro:       { fontSize: 13, color: C.mid, lineHeight: 20, marginBottom: 14 },
  label:       { fontSize: 12, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 4 },
  input:       { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.dark, backgroundColor: C.bg, marginBottom: 8 },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0ede8' },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: C.dark },
  toggleSub:   { fontSize: 11, color: C.light, marginTop: 2 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel:  { fontSize: 16, fontWeight: '700', color: C.dark },
  totalValue:  { fontSize: 24, fontWeight: '800', color: C.green },
  totalPct:    { fontSize: 12, color: C.light, marginBottom: 12 },
  divider:     { height: 1, backgroundColor: '#f0ede8', marginVertical: 12 },
  bandRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  bandLabel:   { fontSize: 12, color: C.dark },
  bandRate:    { fontSize: 11, color: C.light },
  bandTax:     { fontSize: 13, fontWeight: '700', color: C.dark },
  disclaimer:  { fontSize: 11, color: C.light, marginTop: 12, lineHeight: 16 },
})
