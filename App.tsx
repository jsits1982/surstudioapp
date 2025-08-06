/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useColorScheme } from 'react-native';

// Import screens
import ContentScreen from './src/screens/ContentScreen';
import RiyaazScreen from './src/screens/RiyaazScreen';
import ComposerScreen from './src/screens/ComposerScreen';
import MixerScreen from './src/screens/MixerScreen';

const Tab = createBottomTabNavigator();

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const TabBarIcon = ({ name, focused }: { name: string; focused: boolean }) => {
    const iconMap: { [key: string]: string } = {
      Content: '📚',
      Riyaaz: '🎵',
      Composer: '🎼',
      Mixer: '🎛️',
    };

    return (
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
        {iconMap[name]}
      </Text>
    );
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name={route.name} focused={focused} />
          ),
          headerShown: false,
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: isDarkMode ? '#888' : '#666',
          tabBarStyle: {
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            borderTopColor: isDarkMode ? '#333' : '#e0e0e0',
            height: 60,
            paddingBottom: 5,
            paddingTop: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen 
          name="Content" 
          component={ContentScreen}
          options={{
            tabBarLabel: 'Content',
          }}
        />
        <Tab.Screen 
          name="Riyaaz" 
          component={RiyaazScreen}
          options={{
            tabBarLabel: 'Riyaaz',
          }}
        />
        <Tab.Screen 
          name="Composer" 
          component={ComposerScreen}
          options={{
            tabBarLabel: 'Composer',
          }}
        />
        <Tab.Screen 
          name="Mixer" 
          component={MixerScreen}
          options={{
            tabBarLabel: 'Mixer',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
