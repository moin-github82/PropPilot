import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

interface Doc {
  id:       string
  icon:     string
  name:     string
  category: string
  date:     string
  size:     string
}

const DEFAULTS: Doc[] = [
  { id: '1', icon: '⚡', name: 'EPC Certificate 2023',        category: 'Energy',    date: '12 Jan 2023', size: '284 KB' },
  { id: '2', icon: '🔥', name: 'Gas Safety Certificate CP12', category: 'Gas',       date: '3 Oct 2024',  size: '512 KB' },
  { id: '3', icon: '📋', name: 'RICS Level 2 Survey',         category: 'Survey',    date: '15 Jun 2022', size: '3.1 MB' },
  { id: '4', icon: '⚖️', name: 'Title Register',              category: 'Legal',     date: '1 Jul 2022',  size: '198 KB' },
]

const CATEGORIES = ['All', 'Energy', 'Gas', 'Survey', 'Legal', 'Planning', 'Other']

const CAT_COLOUR: Record<string, string> = {
  Energy:   '#eff6ff', Gas: '#fff7ed', Survey: '#f0fdf4',
  Legal:    '#fef9c3', Planning: '#fdf4ff', Other: C.bg,
}

export default function DocumentsScreen() {
  const [docs,    setDocs]    = useState<Doc[]>(DEFAULTS)
  const [filter,  setFilter]  = useState('All')
  const [modal,   setModal]   = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat,  setNewCat]  = useState('Other')

  const filtered = filter === 'All' ? docs : docs.filter(d => d.category === filter)

  const addDoc = () => {
    if (!newName.trim()) return
    setDocs(prev => [...prev, {
      id: Date.now().toString(), icon: '📄',
      name: newName.trim(), category: newCat,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      size: '—',
    }])
    setNewName(''); setNewCat('Other'); setModal(false)
  }

  const deleteDoc = (id: string) => {
    Alert.alert('Remove document', 'Remove this document from your vault?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setDocs(prev => prev.filter(d => d.id !== id)) },
    ])
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="Document Vault" rightLabel="+ Add" onRight={() => setModal(true)} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Stats */}
        <View style={s.statsRow}>
          <Card style={s.statCard}>
            <Text style={[s.statNum, { color: C.green }]}>{docs.length}</Text>
            <Text style={s.statLabel}>Documents</Text>
          </Card>
          <Card style={s.statCard}>
            <Text style={[s.statNum, { color: C.mid }]}>{new Set(docs.map(d => d.category)).size}</Text>
            <Text style={s.statLabel}>Categories</Text>
          </Card>
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.filterPill, filter === cat && s.filterActive]}
              onPress={() => setFilter(cat)}
            >
              <Text style={[s.filterText, filter === cat && s.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Doc list */}
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📁</Text>
            <Text style={s.emptyText}>No documents in {filter} yet</Text>
            <Btn label="Add a document" onPress={() => setModal(true)} variant="outline" style={{ marginTop: 12, width: 180 }} />
          </View>
        ) : (
          filtered.map(doc => (
            <TouchableOpacity key={doc.id} onLongPress={() => deleteDoc(doc.id)} activeOpacity={0.85}>
              <Card style={[s.docCard, { backgroundColor: CAT_COLOUR[doc.category] ?? C.bg }]}>
                <View style={s.docRow}>
                  <Text style={s.docIcon}>{doc.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.docName}>{doc.name}</Text>
                    <Text style={s.docMeta}>{doc.category}  ·  {doc.date}  ·  {doc.size}</Text>
                  </View>
                  <Text style={s.docArrow}>›</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <Text style={s.hint}>Long-press a document to remove it. Documents are stored locally on this device.</Text>
      </ScrollView>

      {/* Add modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add document</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={s.inputLabel}>Document name *</Text>
            <TextInput style={s.input} placeholder="e.g. Gas Safety Certificate CP12" placeholderTextColor={C.light} value={newName} onChangeText={setNewName} />

            <Text style={s.inputLabel}>Category</Text>
            <View style={s.catGrid}>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <TouchableOpacity key={cat} style={[s.catPill, newCat === cat && s.catActive]} onPress={() => setNewCat(cat)}>
                  <Text style={[s.catText, newCat === cat && s.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Btn label="Add to vault" onPress={addDoc} style={{ marginTop: 20 }} />
            <Text style={s.modalNote}>File upload from device coming in a future update. For now, save document names and metadata to keep track.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.bg },
  scroll:         { flex: 1 },
  content:        { padding: 16, paddingBottom: 40 },
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard:       { flex: 1, alignItems: 'center', padding: 12 },
  statNum:        { fontSize: 24, fontWeight: '800' },
  statLabel:      { fontSize: 11, color: C.light, marginTop: 2 },
  filterScroll:   { marginBottom: 14, marginHorizontal: -16 },
  filterContent:  { paddingHorizontal: 16, gap: 8 },
  filterPill:     { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: C.card },
  filterActive:   { backgroundColor: C.dark, borderColor: C.dark },
  filterText:     { fontSize: 12, fontWeight: '600', color: C.mid },
  filterTextActive: { color: '#fff' },
  docCard:        { marginBottom: 8 },
  docRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon:        { fontSize: 24 },
  docName:        { fontSize: 14, fontWeight: '600', color: C.dark },
  docMeta:        { fontSize: 11, color: C.light, marginTop: 2 },
  docArrow:       { fontSize: 20, color: C.light },
  empty:          { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:      { fontSize: 40, marginBottom: 10 },
  emptyText:      { fontSize: 14, color: C.light },
  hint:           { fontSize: 11, color: C.light, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  modal:          { flex: 1, backgroundColor: '#fff' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: C.dark },
  modalClose:     { fontSize: 18, color: C.light },
  inputLabel:     { fontSize: 12, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 14 },
  input:          { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.dark, backgroundColor: C.bg },
  catGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill:        { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  catActive:      { backgroundColor: C.green, borderColor: C.green },
  catText:        { fontSize: 13, color: C.mid },
  catTextActive:  { color: '#fff', fontWeight: '600' },
  modalNote:      { fontSize: 12, color: C.light, marginTop: 16, lineHeight: 18, textAlign: 'center' },
})
