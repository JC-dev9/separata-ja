import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useFavorites } from '@/src/hooks/useFavorites';
import { colors } from '@/src/theme/colors';

export default function TabLayout() {
  const { favorites } = useFavorites();
  const favCount = favorites.size;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Músicas',
          headerTitle: 'Separata JA',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarBadge: favCount > 0 ? favCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.background,
            fontSize: 11,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tuner"
        options={{
          title: 'Afinador',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-note" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Definições',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
