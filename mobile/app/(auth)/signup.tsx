import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signup, type UserRole } from '../../lib/auth'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

type RoleOption = { id: UserRole; emoji: string; label: string; desc: string }

const ROLES: RoleOption[] = [
  { id: 'buyer', emoji: '🏠', label: 'HomeBuyer',  desc: 'Searching for or buying a property' },
  { id: 'owner', emoji: '🔑', label: 'HomeOwner',  desc: 'Managing a property you own' },
]

export default function SignupScreen() {
  const router = useRouter()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState<UserRole>('buyer')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSignup = async () => {
    setError('')
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const user = await signup(name.trim(), email.trim(), password, role)
      router.replace(user.role === 'buyer' ? '/(buyer)/' : '/(owner)/')
    } catch (e: any) {
      setError(e.message ?? 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.brand}>
            <Text style={s.wordmark}>Prop<Text style={s.green}>Pilot</Text></Text>
            <Text style={s.tagline}>Create your free account</Text>
          </View>

          <View style={s.card}>
            <Text style={s.heading}>Get started</Text>
            <Text style={s.sub}>Free forever — no card required.</Text>

            {error ? <View style={s.errBox}><Text style={s.errText}>{error}</Text></View> : null}

            {/* Role picker */}
            <Text style={s.label}>I am a…</Text>
            <View style={s.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.rolePill, role === r.id && s.rolePillActive]}
                  onPress={() => setRole(r.id)}
                >
                  <Text style={s.roleEmoji}>{r.emoji}</Text>
                  <Text style={[s.roleLabel, role === r.id && s.roleLabelActive]}>{r.label}</Text>
                  <Text style={s.roleDesc}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Full name</Text>
            <TextInput style={s.input} placeholder="Jane Smith" placeholderTextColor={C.light}
              value={name} onChangeText={setName} />

            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={C.light}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} placeholder="Min. 6 characters" placeholderTextColor={C.light}
              secureTextEntry value={password} onChangeText={setPassword} />

            <Btn label="Create account" onPress={handleSignup} loading={loading} style={{ marginTop: 8 }} />
          </View>

          <TouchableOpacity onPress={() => router.back()} style={s.switchRow}>
            <Text style={s.switchText}>Already have an account? </Text>
            <Text style={[s.switchText, s.switchLink]}>Sign in →</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: C.bg },
  scroll:          { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand:           { alignItems: 'center', marginBottom: 28 },
  wordmark:        { fontSize: 30, fontWeight: '800', color: C.dark },
  green:           { color: C.green },
  tagline:         { fontSize: 13, color: C.light, marginTop: 4 },
  card:            { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 24, marginBottom: 20 },
  heading:         { fontSize: 22, fontWeight: '700', color: C.dark, marginBottom: 6 },
  sub:             { fontSize: 13, color: C.light, marginBottom: 16 },
  errBox:          { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, padding: 12, marginBottom: 14 },
  errText:         { fontSize: 13, color: '#b91c1c' },
  label:           { fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 12 },
  input:           { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.dark, backgroundColor: C.bg },
  roleRow:         { flexDirection: 'row', gap: 10 },
  rolePill:        { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: C.bg },
  rolePillActive:  { borderColor: C.green, backgroundColor: C.greenLight },
  roleEmoji:       { fontSize: 22, marginBottom: 4 },
  roleLabel:       { fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 2 },
  roleLabelActive: { color: C.green },
  roleDesc:        { fontSize: 10, color: C.light, textAlign: 'center' },
  switchRow:       { flexDirection: 'row', justifyContent: 'center' },
  switchText:      { fontSize: 13, color: C.light },
  switchLink:      { color: C.green, fontWeight: '600' },
})
