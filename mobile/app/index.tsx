import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getUser } from '../lib/auth'
import { C } from '../lib/colours'

/** Splash gate: reads auth state and routes to the right stack. */
export default function Index() {
  const router = useRouter()

  useEffect(() => {
    getUser().then(user => {
      if (!user) {
        router.replace('/(auth)/login')
      } else if (user.role === 'buyer') {
        router.replace('/(buyer)/')
      } else {
        router.replace('/(owner)/')
      }
    })
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={C.green} />
    </View>
  )
}
