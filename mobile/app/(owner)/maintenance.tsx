import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

interface Task {
  id:       string
  icon:     string
  title:    string
  dueDate:  string
  category: string
  done:     boolean
}

const DEFAULTS: Task[] = [
  { id: '1', icon: '🔥', title: 'Annual boiler service',       dueDate: 'Oct 2025', category: 'Gas',       done: false },
  { id: '2', icon: '💧', title: 'Gutter & downpipe clean',     dueDate: 'Nov 2025', category: 'Exterior',  done: false },
  { id: '3', icon: '⚡', title: 'EICR electrical inspection',  dueDate: 'Apr 2029', category: 'Electrical',done: true  },
  { id: '4', icon: '🏠', title: 'Roof tile inspection',        dueDate: 'Mar 2026', category: 'Structure', done: false },
  { id: '5', icon: '🔥', title: 'Gas safety certificate (CP12)',dueDate: 'Sep 2025', category: 'Gas',       done: false },
]

const CATEGORY_COLOUR: Record<string, string> = {
  Gas:       '#fff7ed',
  Electrical:'#eff6ff',
  Exterior:  '#f0fdf4',
  Structure: '#fef9c3',
}

export default function MaintenanceScreen() {
  const [tasks,   setTasks]   = useState<Task[]>(DEFAULTS)
  const [modal,   setModal]   = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate,  setNewDate]  = useState('')

  const toggleDone = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const addTask = () => {
    if (!newTitle.trim()) return
    setTasks(prev => [...prev, {
      id: Date.now().toString(), icon: '🔧',
      title: newTitle.trim(), dueDate: newDate.trim() || 'No date',
      category: 'General', done: false,
    }])
    setNewTitle(''); setNewDate(''); setModal(false)
  }

  const deleteTask = (id: string) => {
    Alert.alert('Delete task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setTasks(prev => prev.filter(t => t.id !== id)) },
    ])
  }

  const pending  = tasks.filter(t => !t.done)
  const complete = tasks.filter(t =>  t.done)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title="Maintenance Calendar" rightLabel="+ Add" onRight={() => setModal(true)} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Due',      value: pending.length,  color: C.amber },
            { label: 'Done',     value: complete.length, color: C.green },
            { label: 'Total',    value: tasks.length,    color: C.mid   },
          ].map(stat => (
            <Card key={stat.label} style={s.statCard}>
              <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        {/* Pending tasks */}
        {pending.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Upcoming</Text>
            {pending.map(task => (
              <TouchableOpacity key={task.id} onPress={() => toggleDone(task.id)} onLongPress={() => deleteTask(task.id)} activeOpacity={0.85}>
                <Card style={[s.taskCard, { backgroundColor: CATEGORY_COLOUR[task.category] ?? C.bg }]}>
                  <View style={s.taskTop}>
                    <Text style={s.taskIcon}>{task.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.taskTitle}>{task.title}</Text>
                      <Text style={s.taskMeta}>{task.category}  ·  Due {task.dueDate}</Text>
                    </View>
                    <View style={s.checkCircle} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Completed tasks */}
        {complete.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Completed</Text>
            {complete.map(task => (
              <TouchableOpacity key={task.id} onPress={() => toggleDone(task.id)} activeOpacity={0.85}>
                <Card style={s.taskCardDone}>
                  <View style={s.taskTop}>
                    <Text style={[s.taskIcon, { opacity: 0.4 }]}>{task.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.taskTitleDone}>{task.title}</Text>
                      <Text style={s.taskMeta}>{task.category}</Text>
                    </View>
                    <View style={s.checkCircleDone}>
                      <Text style={s.checkMark}>✓</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={s.hint}>Long-press a task to delete it.</Text>
      </ScrollView>

      {/* Add modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New maintenance task</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={s.inputLabel}>Task name *</Text>
            <TextInput style={s.input} placeholder="e.g. Annual boiler service" placeholderTextColor={C.light} value={newTitle} onChangeText={setNewTitle} />
            <Text style={s.inputLabel}>Due date</Text>
            <TextInput style={s.input} placeholder="e.g. Oct 2025" placeholderTextColor={C.light} value={newDate} onChangeText={setNewDate} />
            <Btn label="Add task" onPress={addTask} style={{ marginTop: 16 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1 },
  content:       { padding: 16, paddingBottom: 40 },
  statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:      { flex: 1, alignItems: 'center', padding: 12 },
  statNum:       { fontSize: 24, fontWeight: '800' },
  statLabel:     { fontSize: 11, color: C.light, marginTop: 2 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: C.dark, marginBottom: 8 },
  taskCard:      { marginBottom: 8, borderWidth: 1, borderColor: C.border },
  taskCardDone:  { marginBottom: 8, backgroundColor: '#f9f9f9', opacity: 0.7 },
  taskTop:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskIcon:      { fontSize: 22 },
  taskTitle:     { fontSize: 14, fontWeight: '600', color: C.dark },
  taskTitleDone: { fontSize: 14, color: C.light, textDecorationLine: 'line-through' },
  taskMeta:      { fontSize: 11, color: C.light, marginTop: 2 },
  checkCircle:   { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.border },
  checkCircleDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  checkMark:     { color: '#fff', fontSize: 12, fontWeight: '800' },
  hint:          { fontSize: 11, color: C.light, textAlign: 'center', marginTop: 16 },
  modal:         { flex: 1, backgroundColor: '#fff' },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: C.dark },
  modalClose:    { fontSize: 18, color: C.light },
  inputLabel:    { fontSize: 12, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 14 },
  input:         { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.dark, backgroundColor: C.bg },
})
