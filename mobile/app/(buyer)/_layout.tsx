import { Tabs } from 'expo-router'
import { C } from '../../lib/colours'

export default function BuyerLayout() {
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
      <Tabs.Screen name="index"           options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tabs.Screen name="property-report" options={{ title: 'Report',    tabBarIcon: ({ color }) => <TabIcon icon="🔍" color={color} /> }} />
      <Tabs.Screen name="stamp-duty"      options={{ title: 'Stamp Duty',tabBarIcon: ({ color }) => <TabIcon icon="🏷️" color={color} /> }} />
      <Tabs.Screen name="lease-extension" options={{ title: 'Lease',     tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} /> }} />
      <Tabs.Screen name="checklist"       options={{ title: 'Checklist', tabBarIcon: ({ color }) => <TabIcon icon="🧾" color={color} /> }} />
    </Tabs>
  )
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}
