import { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchPropertyReport, type PropertyReport } from '../../lib/api'
import { Card } from '../../components/Card'
import { Btn } from '../../components/Btn'
import { Header } from '../../components/Header'
import { C } from '../../lib/colours'

type RiskLevel = 'high' | 'medium' | 'low' | 'very-low'

const RISK_COLOURS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  'high':     { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  'medium':   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  'low':      { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  'very-low': { bg: C.greenLight, text: '#14532d', border: C.greenBorder },
}

function RiskBadge({ level, label }: { level: RiskLevel; label: string }) {
  const col = RISK_COLOURS[level] ?? RISK_COLOURS['low']
  return (
    <View style={[rb.badge, { backgroundColor: col.bg, borderColor: col.border }]}>
      <Text style={[rb.text, { color: col.text }]}>{label}</Text>
    </View>
  )
}
const rb = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  text:  { fontSize: 12, fontWeight: '700' },
})

function CheckRow({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <View style={cr.row}>
      <Text style={cr.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={cr.label}>{label}</Text>
        {sub ? <Text style={cr.sub}>{sub}</Text> : null}
      </View>
      <Text style={cr.value}>{value}</Text>
    </View>
  )
}
const cr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  icon:  { fontSize: 20, width: 28 },
  label: { fontSize: 13, fontWeight: '600', color: C.dark },
  sub:   { fontSize: 11, color: C.light, marginTop: 2 },
  value: { fontSize: 13, fontWeight: '700', color: C.dark },
})

export default function PropertyReportScreen() {
  const [postcode, setPostcode] = useState('')
  const [address,  setAddress]  = useState('')
  const [report,   setReport]   = useState<PropertyReport | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const runReport = async () => {
    setError('')
    const clean = postcode.trim()
    if (!clean) { setError('Please enter a UK postcode.'); return }
    setLoading(true)
    setReport(null)
    try {
      const r = await fetchPropertyReport(clean, address.trim() || undefined)
      setReport(r)
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch report. Check your postcode and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="Property Report" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <Text style={s.intro}>
          Enter a UK postcode to get an automated flood risk, EPC, crime, broadband, and council tax report.
        </Text>

        {/* Input card */}
        <Card style={s.inputCard}>
          <Text style={s.label}>Postcode *</Text>
          <TextInput
            style={s.input} placeholder="e.g. SW1A 1AA"
            placeholderTextColor={C.light}
            autoCapitalize="characters"
            value={postcode}
            onChangeText={setPostcode}
          />
          <Text style={s.label}>Address (optional)</Text>
          <TextInput
            style={s.input} placeholder="e.g. 10 Downing Street"
            placeholderTextColor={C.light}
            value={address}
            onChangeText={setAddress}
          />
          {error ? <Text style={s.err}>{error}</Text> : null}
          <Btn label={loading ? 'Running checks…' : 'Run report'} onPress={runReport} loading={loading} style={{ marginTop: 8 }} />
        </Card>

        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator color={C.green} size="large" />
            <Text style={s.loadingText}>Checking 5 data sources…</Text>
          </View>
        )}

        {report && (
          <View style={{ gap: 14 }}>

            {/* Flood */}
            <Card>
              <View style={s.checkHeader}>
                <Text style={s.checkTitle}>🌊  Flood Risk</Text>
                <RiskBadge level={report.flood.riskLevel} label={report.flood.riskLabel} />
              </View>
              <Text style={s.checkDesc}>{report.flood.description}</Text>
              <View style={s.divider} />
              <CheckRow icon="⚠️" label="Active warnings"  value={String(report.flood.activeWarnings)} />
              <View style={s.divider} />
              <CheckRow icon="🔔" label="Active alerts"    value={String(report.flood.activeAlerts)} />
            </Card>

            {/* EPC */}
            <Card>
              <View style={s.checkHeader}>
                <Text style={s.checkTitle}>⚡  EPC Rating</Text>
                {report.epc.found && report.epc.certificate
                  ? <RiskBadge level={report.epc.certificate.currentBand <= 'C' ? 'very-low' : report.epc.certificate.currentBand <= 'D' ? 'low' : 'medium'} label={`Band ${report.epc.certificate.currentBand}`} />
                  : <Text style={s.notFound}>Not found</Text>}
              </View>
              {report.epc.found && report.epc.certificate ? (
                <>
                  <CheckRow icon="🏠" label="Property type"   value={report.epc.certificate.propertyType} />
                  <View style={s.divider} />
                  <CheckRow icon="📊" label="Current score"   value={String(report.epc.certificate.currentScore)} sub="out of 100" />
                  <View style={s.divider} />
                  <CheckRow icon="🎯" label="Potential score" value={String(report.epc.certificate.potentialScore)} />
                  <View style={s.divider} />
                  <CheckRow icon="📅" label="Expires"         value={report.epc.certificate.expiryDate} />
                </>
              ) : (
                <Text style={s.checkDesc}>{report.epc.message ?? 'No EPC certificate found for this property.'}</Text>
              )}
            </Card>

            {/* Crime */}
            <Card>
              <View style={s.checkHeader}>
                <Text style={s.checkTitle}>🚔  Crime</Text>
                <RiskBadge
                  level={report.crime.totalCrimes > 100 ? 'high' : report.crime.totalCrimes > 40 ? 'medium' : 'very-low'}
                  label={`${report.crime.totalCrimes} crimes`}
                />
              </View>
              <Text style={s.checkDesc}>Most common: {report.crime.topCategory} ({report.crime.topCount} incidents). Period: {report.crime.period}.</Text>
              <View style={s.divider} />
              {Object.entries(report.crime.breakdown).slice(0, 5).map(([cat, count]) => (
                <View key={cat}>
                  <CheckRow icon="•" label={cat} value={String(count)} />
                  <View style={s.divider} />
                </View>
              ))}
            </Card>

            {/* Broadband */}
            <Card>
              <View style={s.checkHeader}>
                <Text style={s.checkTitle}>📶  Broadband</Text>
                {report.broadband.found
                  ? <RiskBadge level={report.broadband.ultrafast ? 'very-low' : report.broadband.superfast ? 'low' : 'medium'} label={report.broadband.ultrafast ? 'Ultrafast' : report.broadband.superfast ? 'Superfast' : 'Standard'} />
                  : <Text style={s.notFound}>Not found</Text>}
              </View>
              {report.broadband.found ? (
                <>
                  <CheckRow icon="⬇️" label="Avg download" value={`${report.broadband.avgDownload ?? '?'} Mbps`} />
                  <View style={s.divider} />
                  <CheckRow icon="⬆️" label="Avg upload"   value={`${report.broadband.avgUpload ?? '?'} Mbps`} />
                </>
              ) : (
                <Text style={s.checkDesc}>{report.broadband.message ?? 'No broadband data found.'}</Text>
              )}
            </Card>

            {/* Council Tax */}
            <Card>
              <View style={s.checkHeader}>
                <Text style={s.checkTitle}>🏛️  Council Tax</Text>
                {report.councilTax.found && report.councilTax.band
                  ? <RiskBadge level={report.councilTax.band >= 'F' ? 'high' : report.councilTax.band >= 'D' ? 'medium' : 'very-low'} label={`Band ${report.councilTax.band}`} />
                  : <Text style={s.notFound}>Not found</Text>}
              </View>
              {report.councilTax.found ? (
                <CheckRow icon="🏙️" label="Local authority" value={report.councilTax.area ?? '—'} />
              ) : (
                <Text style={s.checkDesc}>{report.councilTax.message ?? 'No council tax data found.'}</Text>
              )}
            </Card>

            <Text style={s.disclaimer}>
              Data sourced from Environment Agency, MHCLG, Police.uk, Ofcom and Postcodes.io. Provided for information only — not professional advice.
            </Text>

          </View>
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
  inputCard:   { marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 10 },
  input:       { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.dark, backgroundColor: C.bg },
  err:         { fontSize: 12, color: C.red, marginTop: 8 },
  loadingBox:  { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingText: { fontSize: 13, color: C.mid },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  checkTitle:  { fontSize: 15, fontWeight: '700', color: C.dark },
  checkDesc:   { fontSize: 12, color: C.mid, lineHeight: 18 },
  notFound:    { fontSize: 12, color: C.light, fontStyle: 'italic' },
  divider:     { height: 1, backgroundColor: '#f0ede8' },
  disclaimer:  { fontSize: 11, color: C.light, lineHeight: 16, marginTop: 8, textAlign: 'center' },
})
