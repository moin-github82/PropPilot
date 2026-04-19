import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getUser, logout, type User } from '../../lib/auth'
import { Card } from '../../components/Card'
import { PlanBadge } from '../../components/PlanBadge'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

const TOOLS = [
  { icon: '🔍', label: 'Property Report',  desc: 'Flood, EPC, crime & broadband',  route: '/property-report' },
  { icon: '🏷️', label: 'Stamp Duty',        desc: 'Calculate your SDLT bill',        route: '/stamp-duty' },
  { icon: '📋', label: 'Lease Extension',   desc: 'Estimate your premium',           route: '/lease-extension' },
  { icon: '🧾', label: 'Buying Checklist',  desc: 'FTB, standard & BTL checklists', route: '/checklist' },
]

const PREMIUM = [
  { icon: '⚖️', label: 'Legal Checks',     price: 'from £800' },
  { icon: '🏗️', label: 'RICS Survey',       price: 'from £500' },
  { icon: '🔥', label: 'Gas Safety (CP12)', price: 'from £60'  },
  { icon: '⚡', label: 'EICR Electrical',   price: 'from £150' },
]

export default function BuyerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getUser().then(u => {
      if (!u) { router.replace('/(auth)/login'); return }
      if (u.role === 'owner') { router.replace('/(owner)/'); return }
      setUser(u)
    })
  }, [])

  const handleSignOut = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  if (!user) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.green} />
    </View>
  )

  const isPro = user.plan !== 'free'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.topBar}>
          <Text style={s.wordmark}>Prop<Text style={s.green}>Pilot</Text></Text>
          <View style={s.topRight}>
            <PlanBadge plan={user.plan} />
            <TouchableOpacity onPress={handleSignOut} style={s.signOutBtn}>
              <Text style={s.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome */}
        <View style={s.welcome}>
          <Text style={s.eyebrow}>HomeBuyer Dashboard</Text>
          <Text style={s.greeting}>Welcome back, {user.name.split(' ')[0]} 👋</Text>
        </View>

        {/* Upgrade nudge */}
        {!isPro && (
          <View style={s.nudge}>
            <Text style={s.nudgeTitle}>Unlock unlimited property reports</Text>
            <Text style={s.nudgeDesc}>Pro plan: unlimited reports, PDF downloads & 10% off professional services</Text>
            <TouchableOpacity style={s.nudgeBtn}>
              <Text style={s.nudgeBtnText}>See Pro plans →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick tools */}
        <Text style={s.sectionTitle}>Your tools</Text>
        <View style={s.grid}>
          {TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.label}
              style={s.toolCard}
              onPress={() => router.push(`/(buyer)${tool.route}` as any)}
              activeOpacity={0.85}
            >
              <Text style={s.toolIcon}>{tool.icon}</Text>
              <Text style={s.toolLabel}>{tool.label}</Text>
              <Text style={s.toolDesc}>{tool.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Professional services */}
        <Text style={s.sectionTitle}>Professional services</Text>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {PREMIUM.map((svc, i) => (
            <View key={svc.label} style={[s.svcRow, i < PREMIUM.length - 1 && s.svcBorder]}>
              <Text style={s.svcIcon}>{svc.icon}</Text>
              <Text style={s.svcLabel}>{svc.label}</Text>
              <Text style={s.svcPrice}>{svc.price}</Text>
              <View style={[s.svcBtn, isPro && s.svcBtnActive]}>
                <Text style={[s.svcBtnText, isPro && s.svcBtnTextActive]}>
                  {isPro ? 'Quote →' : '🔒 Pro'}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Account card */}
        <Card style={s.accountCard}>
          <Text style={s.accountTitle}>Account</Text>
          <View style={s.accountGrid}>
            {[
              ['Name',  user.name],
              ['Email', user.email],
              ['Role',  'HomeBuyer'],
              ['Plan',  user.plan.charAt(0).toUpperCase() + user.plan.slice(1)],
            ].map(([label, value]) => (
              <View key={label} style={s.accountItem}>
                <Text style={s.accountLabel}>{label}</Text>
                <Text style={s.accountValue}>{value}</Text>
              </View>
            ))}
          </View>
          <Btn label="Sign out" variant="ghost" onPress={handleSignOut} style={{ marginTop: 12 }} />
        </Card>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.bg },
  scroll:         { flex: 1 },
  content:        { padding: 16, paddingBottom: 32 },
  topBar:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  wordmark:       { fontSize: 22, fontWeight: '800', color: C.dark },
  green:          { color: C.green },
  topRight:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signOutBtn:     { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  signOutText:    { fontSize: 12, color: C.mid },
  welcome:        { marginBottom: 16 },
  eyebrow:        { fontSize: 11, fontWeight: '500', color: C.light, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  greeting:       { fontSize: 24, fontWeight: '700', color: C.dark },
  nudge:          { backgroundColor: C.green, borderRadius: 14, padding: 16, marginBottom: 20 },
  nudgeTitle:     { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  nudgeDesc:      { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 10 },
  nudgeBtn:       { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  nudgeBtnText:   { fontSize: 13, fontWeight: '700', color: C.green },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: C.dark, marginBottom: 10, marginTop: 16 },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  toolCard:       { width: '47.5%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14 },
  toolIcon:       { fontSize: 24, marginBottom: 8 },
  toolLabel:      { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 3 },
  toolDesc:       { fontSize: 11, color: C.light, lineHeight: 16 },
  svcRow:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  svcBorder:      { borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  svcIcon:        { fontSize: 20 },
  svcLabel:       { flex: 1, fontSize: 13, fontWeight: '500', color: C.dark },
  svcPrice:       { fontSize: 12, fontWeight: '700', color: C.dark },
  svcBtn:         { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  svcBtnActive:   { backgroundColor: C.green, borderColor: C.green },
  svcBtnText:     { fontSize: 11, fontWeight: '600', color: C.light },
  svcBtnTextActive: { color: '#fff' },
  accountCard:    { marginTop: 16 },
  accountTitle:   { fontSize: 13, fontWeight: '700', color: C.dark, marginBottom: 12 },
  accountGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accountItem:    { width: '45%' },
  accountLabel:   { fontSize: 11, color: C.light, marginBottom: 2 },
  accountValue:   { fontSize: 13, fontWeight: '500', color: C.dark },
})
