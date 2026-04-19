import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { login } from '../../lib/auth'
import { Btn } from '../../components/Btn'
import { C } from '../../lib/colours'

export default function LoginScreen() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      router.replace(user.role === 'buyer' ? '/(buyer)/' : '/(owner)/')
    } catch (e: any) {
      setError(e.message ?? 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Wordmark */}
          <View style={s.brand}>
            <Text style={s.wordmark}>Prop<Text style={s.green}>Pilot</Text></Text>
            <Text style={s.tagline}>Your property. Fully understood.</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.heading}>Sign in</Text>
            <Text style={s.sub}>Welcome back — enter your details below.</Text>

            {error ? <View style={s.errBox}><Text style={s.errText}>{error}</Text></View> : null}

            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={C.light}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={C.light}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Btn label="Sign in" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={s.switchRow}>
            <Text style={s.switchText}>Don't have an account? </Text>
            <Text style={[s.switchText, s.switchLink]}>Sign up free →</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  scroll:     { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand:      { alignItems: 'center', marginBottom: 32 },
  wordmark:   { fontSize: 32, fontWeight: '800', color: C.dark },
  green:      { color: C.green },
  tagline:    { fontSize: 13, color: C.light, marginTop: 4 },
  card:       { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 24, marginBottom: 20 },
  heading:    { fontSize: 22, fontWeight: '700', color: C.dark, marginBottom: 6 },
  sub:        { fontSize: 13, color: C.light, marginBottom: 20 },
  errBox:     { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8, padding: 12, marginBottom: 14 },
  errText:    { fontSize: 13, color: '#b91c1c' },
  label:      { fontSize: 13, fontWeight: '600', color: C.dark, marginBottom: 6, marginTop: 12 },
  input:      { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.dark, backgroundColor: C.bg },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchText: { fontSize: 13, color: C.light },
  switchLink: { color: C.green, fontWeight: '600' },
})
