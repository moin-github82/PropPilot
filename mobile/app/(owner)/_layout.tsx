import { Tabs } from 'expo-router'
import { C } from '../../lib/colours'

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   C.green,
        tabBarInactiveTintColor: C.light,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: C.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"       options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon icon="🏡" color={color} /> }} />
      <Tabs.Screen name="maintenance" options={{ title: 'Maintenance',tabBarIcon: ({ color }) => <TabIcon icon="🔧" color={color} /> }} />
      <Tabs.Screen name="documents"   options={{ title: 'Documents',  tabBarIcon: ({ color }) => <TabIcon icon="📁" color={color} /> }} />
      <Tabs.Screen name="epc-upgrade" options={{ title: 'EPC',        tabBarIcon: ({ color }) => <TabIcon icon="⚡" color={color} /> }} />
      <Tabs.Screen name="stamp-duty"  options={{ title: 'Stamp Duty', tabBarIcon: ({ color }) => <TabIcon icon="🏷️" color={color} /> }} />
    </Tabs>
  )
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}
