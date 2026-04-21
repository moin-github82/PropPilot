import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable, Linking } from 'react-native'
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
      { id: 'aip',             text: 'Mortgage Agreement in Principle obtained' },
      { id: 'stamp-duty',      text: 'Stamp duty calculated (inc. any surcharges)' },
      { id: 'council-tax',     text: 'Council tax band verified via VOA' },
      { id: 'insurance',       text: 'Buildings insurance cost estimated (inc. flood risk)' },
      { id: 'offer-accepted',  text: '🎉 Offer accepted by seller!', tip: 'Congratulations! Instruct your solicitor and book your survey immediately.' },
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

const OFFER_ACCEPTED_ID = 'offer-accepted'

export default function ChecklistScreen() {
  const [ticked,          setTicked]          = useState<Set<string>>(new Set())
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set(['Legal & Title']))
  const [showTransModal,  setShowTransModal]  = useState(false)

  const toggle = (id: string) => {
    setTicked(prev => {
      const wasChecked = prev.has(id)
      const next = new Set(prev)
      wasChecked ? next.delete(id) : next.add(id)
      if (!wasChecked && id === OFFER_ACCEPTED_ID) {
        setShowTransModal(true)
      }
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

      {/* HomeBuyer → HomeOwner Transition Modal */}
      <Modal
        visible={showTransModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransModal(false)}
      >
        <Pressable style={ms.overlay} onPress={() => setShowTransModal(false)}>
          <Pressable style={ms.sheet} onPress={e => e.stopPropagation()}>
            {/* Close */}
            <TouchableOpacity style={ms.closeBtn} onPress={() => setShowTransModal(false)}>
              <Text style={ms.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Celebration header */}
            <Text style={ms.emoji}>🎉</Text>
            <Text style={ms.title}>Offer accepted!</Text>
            <Text style={ms.subtitle}>
              You're one big step closer to owning your home. When you get the keys, your property journey transforms.
            </Text>

            {/* HomeOwner preview card */}
            <View style={ms.greenCard}>
              <Text style={ms.greenCardTitle}>🏠 Your HomeOwner plan is waiting</Text>
              <Text style={ms.greenCardBody}>
                Switch to PropHealth HomeOwner Pro after completion — property dashboard, maintenance calendar, EPC planner, mortgage radar and document vault.
              </Text>
              <View style={ms.priceRow}>
                <View style={ms.priceBox}>
                  <Text style={ms.priceLabel}>Monthly</Text>
                  <Text style={ms.priceAmount}>£9<Text style={ms.pricePer}>/mo</Text></Text>
                </View>
                <View style={[ms.priceBox, ms.priceBoxHighlight]}>
                  <Text style={[ms.priceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Annual — best value</Text>
                  <Text style={[ms.priceAmount, { color: '#fff' }]}>£75<Text style={[ms.pricePer, { color: 'rgba(255,255,255,0.7)' }]}>/yr</Text></Text>
                  <Text style={ms.priceSaving}>Save 31%</Text>
                </View>
              </View>
            </View>

            {/* Annual lock-in */}
            <View style={ms.amberCard}>
              <Text style={ms.amberTitle}>🔒 Lock in HomeBuyer Pro at £159/yr</Text>
              <Text style={ms.amberBody}>Annual HomeBuyer subscribers get their first month of HomeOwner Pro free after completion.</Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={ms.btnPrimary}
              onPress={() => {
                setShowTransModal(false)
                Linking.openURL('https://prophealth.co.uk/pricing?role=owner&billing=annual')
              }}
            >
              <Text style={ms.btnPrimaryText}>Preview HomeOwner Pro plans →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ms.btnSecondary}
              onPress={() => {
                setShowTransModal(false)
                Linking.openURL('https://prophealth.co.uk/pricing?role=buyer&billing=annual')
              }}
            >
              <Text style={ms.btnSecondaryText}>Lock in HomeBuyer annual (£159/yr) →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.btnGhost} onPress={() => setShowTransModal(false)}>
              <Text style={ms.btnGhostText}>Continue my checklist</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  )
}

const ms = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(26,25,23,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet:            { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 },
  closeBtn:         { position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0ede8', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  closeBtnText:     { fontSize: 13, color: '#5e5a52' },
  emoji:            { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  title:            { fontSize: 20, fontWeight: '700', color: '#1a1917', textAlign: 'center', marginBottom: 6 },
  subtitle:         { fontSize: 13, color: '#5e5a52', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  greenCard:        { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 14, padding: 16, marginBottom: 10 },
  greenCardTitle:   { fontSize: 13, fontWeight: '700', color: '#14532d', marginBottom: 6 },
  greenCardBody:    { fontSize: 12, color: '#166534', lineHeight: 18, marginBottom: 12 },
  priceRow:         { flexDirection: 'row', gap: 10 },
  priceBox:         { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 12, alignItems: 'center' },
  priceBoxHighlight:{ backgroundColor: C.green, borderColor: C.green },
  priceLabel:       { fontSize: 10, color: '#9e998f', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  priceAmount:      { fontSize: 20, fontWeight: '800', color: '#1a1917' },
  pricePer:         { fontSize: 12, fontWeight: '400', color: '#9e998f' },
  priceSaving:      { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  amberCard:        { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, padding: 12, marginBottom: 16 },
  amberTitle:       { fontSize: 12, fontWeight: '700', color: '#7c2d12', marginBottom: 4 },
  amberBody:        { fontSize: 12, color: '#9a3412', lineHeight: 18 },
  btnPrimary:       { backgroundColor: C.green, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnPrimaryText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnSecondary:     { borderWidth: 1.5, borderColor: C.green, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 6 },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: C.green },
  btnGhost:         { padding: 10, alignItems: 'center' },
  btnGhostText:     { fontSize: 13, color: '#9e998f' },
})

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
