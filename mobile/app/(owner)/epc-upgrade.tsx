import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { C } from '../../lib/colours'

const BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const BAND_COLOUR: Record<string, string> = {
  A: '#15803d', B: '#1D9E75', C: '#65a30d', D: '#ca8a04',
  E: '#ea580c', F: '#dc2626', G: '#991b1b',
}

interface Improvement {
  measure:    string
  impact:     string
  saving:     string
  cost:       string
  difficulty: 'Easy' | 'Moderate' | 'Complex'
}

const IMPROVEMENTS: Record<string, Improvement[]> = {
  G: [
    { measure: 'Loft insulation',        impact: 'G→E', saving: '£410/yr', cost: '£300–£600',   difficulty: 'Easy'     },
    { measure: 'Cavity wall insulation', impact: 'G→E', saving: '£315/yr', cost: '£500–£1,500', difficulty: 'Easy'     },
    { measure: 'Upgrade boiler (A-rated)',impact: 'G→D', saving: '£580/yr', cost: '£2,500–£4,000',difficulty:'Moderate' },
    { measure: 'Double glazing',          impact: '+5pts', saving: '£180/yr',cost: '£4,000–£8,000',difficulty:'Complex'  },
  ],
  F: [
    { measure: 'Loft insulation (top-up)',impact: 'F→D', saving: '£215/yr', cost: '£200–£400',  difficulty: 'Easy'     },
    { measure: 'Smart thermostat',        impact: '+3pts', saving: '£75/yr', cost: '£150–£300',  difficulty: 'Easy'     },
    { measure: 'Upgrade boiler (A-rated)',impact: 'F→D', saving: '£340/yr', cost: '£2,500–£4,000',difficulty:'Moderate' },
    { measure: 'Solar panels (3kW)',      impact: '+10pts',saving: '£430/yr', cost: '£5,000–£8,000',difficulty:'Complex' },
  ],
  E: [
    { measure: 'Smart thermostat',        impact: '+3pts', saving: '£75/yr', cost: '£150–£300',  difficulty: 'Easy'     },
    { measure: 'LED lighting throughout', impact: '+2pts', saving: '£55/yr', cost: '£100–£200',  difficulty: 'Easy'     },
    { measure: 'Heat pump (ASHP)',         impact: 'E→C',  saving: '£500/yr', cost: '£10,000–£14,000',difficulty:'Complex'},
    { measure: 'Solar panels (3kW)',       impact: '+10pts',saving: '£430/yr', cost: '£5,000–£8,000',difficulty:'Complex' },
  ],
  D: [
    { measure: 'LED lighting throughout',  impact: '+2pts', saving: '£55/yr', cost: '£100–£200',  difficulty: 'Easy' },
    { measure: 'Smart thermostat',         impact: '+3pts', saving: '£75/yr', cost: '£150–£300',  difficulty: 'Easy' },
    { measure: 'Solar panels (3kW)',        impact: '+10pts',saving: '£430/yr', cost: '£5,000–£8,000',difficulty:'Complex' },
    { measure: 'Draught-proofing',          impact: '+2pts', saving: '£60/yr', cost: '£100–£350',  difficulty: 'Easy' },
  ],
}

const DIFFICULTY_COLOUR: Record<string, string> = {
  Easy: C.greenLight, Moderate: '#fff7ed', Complex: '#fef2f2',
}
const DIFFICULTY_TEXT: Record<string, string> = {
  Easy: '#14532d', Moderate: '#92400e', Complex: '#b91c1c',
}

export default function EpcUpgradeScreen() {
  const [currentBand, setCurrentBand] = useState<string>('E')

  const improvements = IMPROVEMENTS[currentBand] ?? IMPROVEMENTS['D']
  const bandIdx      = BANDS.indexOf(currentBand)
  const targetBand   = BANDS[Math.max(0, bandIdx - 2)] ?? 'A'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="EPC Upgrade Planner" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        <Text style={s.intro}>Select your current EPC band to see recommended improvements and estimated savings.</Text>

        {/* Band picker */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={s.sectionLabel}>Current EPC band</Text>
          <View style={s.bandRow}>
            {BANDS.map(band => (
              <TouchableOpacity
                key={band}
                style={[s.bandPill, { backgroundColor: BAND_COLOUR[band] }, currentBand === band && s.bandSelected]}
                onPress={() => setCurrentBand(band)}
              >
                <Text style={s.bandText}>{band}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.targetRow}>
            <View style={[s.targetBand, { backgroundColor: BAND_COLOUR[currentBand] }]}>
              <Text style={s.targetBandText}>{currentBand}</Text>
            </View>
            <Text style={s.targetArrow}>→</Text>
            <View style={[s.targetBand, { backgroundColor: BAND_COLOUR[targetBand] }]}>
              <Text style={s.targetBandText}>{targetBand}</Text>
            </View>
            <Text style={s.targetLabel}>Recommended target (gov. 2030 goal: Band C)</Text>
          </View>
        </Card>

        {/* Improvement cards */}
        <Text style={s.sectionLabel}>Recommended improvements</Text>
        {improvements.map((imp, i) => (
          <Card key={i} style={s.impCard}>
            <View style={s.impTop}>
              <Text style={s.impMeasure}>{imp.measure}</Text>
              <View style={[s.diffBadge, { backgroundColor: DIFFICULTY_COLOUR[imp.difficulty] }]}>
                <Text style={[s.diffText, { color: DIFFICULTY_TEXT[imp.difficulty] }]}>{imp.difficulty}</Text>
              </View>
            </View>
            <Text style={s.impImpact}>Band impact: <Text style={{ fontWeight: '700', color: C.green }}>{imp.impact}</Text></Text>
            <View style={s.impStats}>
              <View style={s.impStat}>
                <Text style={s.impStatLabel}>Annual saving</Text>
                <Text style={s.impStatValue}>{imp.saving}</Text>
              </View>
              <View style={s.impStat}>
                <Text style={s.impStatLabel}>Est. cost</Text>
                <Text style={s.impStatValue}>{imp.cost}</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Grants notice */}
        <Card style={s.grantCard}>
          <Text style={s.grantTitle}>💡  Government grants available</Text>
          <Text style={s.grantText}>
            The Great British Insulation Scheme and ECO4 grant can fund insulation and heat pump upgrades for eligible households. Check gov.uk/apply-great-british-insulation-scheme for eligibility.
          </Text>
        </Card>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  content:       { padding: 16, paddingBottom: 40 },
  intro:         { fontSize: 13, color: C.mid, lineHeight: 20, marginBottom: 14 },
  sectionLabel:  { fontSize: 12, fontWeight: '600', color: C.dark, marginBottom: 10 },
  bandRow:       { flexDirection: 'row', gap: 8, marginBottom: 14 },
  bandPill:      { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', opacity: 0.6 },
  bandSelected:  { opacity: 1, transform: [{ scale: 1.1 }] },
  bandText:      { color: '#fff', fontWeight: '800', fontSize: 16 },
  targetRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  targetBand:    { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  targetBandText:{ color: '#fff', fontWeight: '800', fontSize: 16 },
  targetArrow:   { fontSize: 18, color: C.light },
  targetLabel:   { flex: 1, fontSize: 11, color: C.light, lineHeight: 16 },
  impCard:       { marginBottom: 10 },
  impTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  impMeasure:    { flex: 1, fontSize: 14, fontWeight: '700', color: C.dark, marginRight: 8 },
  diffBadge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  diffText:      { fontSize: 11, fontWeight: '700' },
  impImpact:     { fontSize: 12, color: C.mid, marginBottom: 10 },
  impStats:      { flexDirection: 'row', gap: 20 },
  impStat:       {},
  impStatLabel:  { fontSize: 10, color: C.light, marginBottom: 2 },
  impStatValue:  { fontSize: 14, fontWeight: '700', color: C.dark },
  grantCard:     { backgroundColor: C.greenLight, borderColor: C.greenBorder, marginTop: 6 },
  grantTitle:    { fontSize: 14, fontWeight: '700', color: '#14532d', marginBottom: 6 },
  grantText:     { fontSize: 12, color: '#166534', lineHeight: 18 },
})
