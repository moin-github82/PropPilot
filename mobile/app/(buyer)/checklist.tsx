import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Header } from '../../components/Header'
import { C } from '../../lib/colours'

interface CheckItem { id: string; text: string; tip?: string }
interface Section   { title: string; icon: string; items: CheckItem[] }

const SECTIONS: Section[] = [
  {
    title: 'Legal & Title', icon: '⚖️',
    items: [
      { id: 'title-register', text: 'Title Register & Title Plan ordered from HMLR', tip: 'Order for £3 at gov.uk/get-information-about-property' },
      { id: 'covenants',      text: 'Covenants, easements & restrictions checked by solicitor' },
      { id: 'planning',       text: 'Planning permissions & enforcement notices reviewed' },
      { id: 'lease',          text: 'Lease length confirmed — aim for 90+ years', tip: 'Below 80 years becomes very expensive to extend.' },
      { id: 'la-searches',    text: 'Local Authority searches completed' },
    ],
  },
  {
    title: 'Structural', icon: '🏗️',
    items: [
      { id: 'rics-survey', text: 'RICS HomeBuyer or Full Structural survey instructed', tip: 'Never skip — a £500 survey can save tens of thousands.' },
      { id: 'damp',        text: 'Damp, mould & condensation inspected' },
      { id: 'roof',        text: 'Roof condition & age assessed' },
      { id: 'electrics',   text: 'Electrical wiring & consumer unit age checked' },
      { id: 'boiler',      text: 'Boiler age & service history confirmed' },
      { id: 'subsidence',  text: 'Subsidence indicators checked (cracks, sticking doors)' },
    ],
  },
  {
    title: 'Financial', icon: '💰',
    items: [
      { id: 'aip',         text: 'Mortgage Agreement in Principle obtained' },
      { id: 'stamp-duty',  text: 'Stamp duty calculated (inc. any surcharges)' },
      { id: 'council-tax', text: 'Council tax band verified via VOA' },
      { id: 'insurance',   text: 'Buildings insurance cost estimated (inc. flood risk)' },
    ],
  },
  {
    title: 'Safety & Compliance', icon: '🛡️',
    items: [
      { id: 'epc',       text: 'EPC rating reviewed (target Band C by 2030)' },
      { id: 'gas',       text: 'Gas safety certificate & boiler service record requested' },
      { id: 'eicr',      text: 'EICR (electrical installation report) obtained' },
      { id: 'knotweed',  text: 'Japanese knotweed survey if vegetation present' },
    ],
  },
  {
    title: 'Location & Environment', icon: '🌍',
    items: [
      { id: 'flood',      text: 'Flood risk report reviewed (Environment Agency)' },
      { id: 'mining',     text: 'Mining & subsidence checks completed (region-specific)' },
      { id: 'noise',      text: 'Noise & air quality assessed at different times of day' },
      { id: 'contaminated', text: 'Contaminated land search carried out' },
    ],
  },
]

export default function ChecklistScreen() {
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Legal & Title']))

  const toggle = (id: string) => {
    setTicked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSection = (title: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  const totalItems = SECTIONS.reduce((a, s) => a + s.items.length, 0)
  const doneCount  = ticked.size
  const pct        = Math.round((doneCount / totalItems) * 100)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="Buying Checklist" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressTop}>
            <Text style={s.progressLabel}>Overall progress</Text>
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressSub}>{doneCount} of {totalItems} items complete</Text>
        </View>

        {/* Sections */}
        {SECTIONS.map(section => {
          const sectionDone = section.items.filter(i => ticked.has(i.id)).length
          const isOpen      = expanded.has(section.title)
          return (
            <View key={section.title} style={s.section}>
              <TouchableOpacity style={s.sectionHeader} onPress={() => toggleSection(section.title)}>
                <Text style={s.sectionIcon}>{section.icon}</Text>
                <Text style={s.sectionTitle}>{section.title}</Text>
                <Text style={s.sectionCount}>{sectionDone}/{section.items.length}</Text>
                <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isOpen && section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.item, i < section.items.length - 1 && s.itemBorder]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, ticked.has(item.id) && s.checkboxDone]}>
                    {ticked.has(item.id) && <Text style={s.checkmark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemText, ticked.has(item.id) && s.itemDone]}>{item.text}</Text>
                    {item.tip && <Text style={s.tip}>{item.tip}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )
        })}

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  content:       { padding: 16, paddingBottom: 40, gap: 12 },
  progressCard:  { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },
  progressTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: C.dark },
  progressPct:   { fontSize: 20, fontWeight: '800', color: C.green },
  progressBar:   { height: 8, backgroundColor: '#f0ede8', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:  { height: '100%', backgroundColor: C.green, borderRadius: 4 },
  progressSub:   { fontSize: 11, color: C.light },
  section:       { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  sectionIcon:   { fontSize: 18 },
  sectionTitle:  { flex: 1, fontSize: 14, fontWeight: '700', color: C.dark },
  sectionCount:  { fontSize: 12, color: C.green, fontWeight: '600' },
  chevron:       { fontSize: 10, color: C.light, marginLeft: 4 },
  item:          { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, backgroundColor: C.bg },
  itemBorder:    { borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxDone:  { backgroundColor: C.green, borderColor: C.green },
  checkmark:     { fontSize: 13, color: '#fff', fontWeight: '800' },
  itemText:      { fontSize: 13, color: C.dark, lineHeight: 20 },
  itemDone:      { color: C.light, textDecorationLine: 'line-through' },
  tip:           { fontSize: 11, color: C.light, marginTop: 3, lineHeight: 16 },
})
