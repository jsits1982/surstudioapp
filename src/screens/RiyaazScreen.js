import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';

// Import existing components
import PitchVisualizer from '../components/PitchVisualizer';
import useAudioRecorder from '../hooks/useAudioRecorder';

const RiyaazScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState('swar');

  const TabButton = ({ id, title, icon, active, onPress }) => (
    <TouchableOpacity 
      style={[
        styles.tabButton, 
        active && styles.activeTabButton,
        { backgroundColor: active ? '#FF6B35' : (isDarkMode ? '#2a2a2a' : '#f0f0f0') }
      ]} 
      onPress={onPress}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[
        styles.tabTitle, 
        { color: active ? 'white' : (isDarkMode ? '#fff' : '#000') }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'swar':
        return <SwarTraining isDarkMode={isDarkMode} />;
      case 'raga':
        return <RagaTraining isDarkMode={isDarkMode} />;
      case 'taal':
        return <TaalTraining isDarkMode={isDarkMode} />;
      case 'pitch':
        return <PitchDetection isDarkMode={isDarkMode} />;
      default:
        return <SwarTraining isDarkMode={isDarkMode} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
          Riyaaz
        </Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
          Training & Practice
        </Text>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <TabButton
          id="swar"
          title="SwaraTraining"
          icon="🎯"
          active={activeTab === 'swar'}
          onPress={() => setActiveTab('swar')}
        />
        <TabButton
          id="raga"
          title="Raga Practice"
          icon="🎼"
          active={activeTab === 'raga'}
          onPress={() => setActiveTab('raga')}
        />
        <TabButton
          id="taal"
          title="Taal Training"
          icon="🥁"
          active={activeTab === 'taal'}
          onPress={() => setActiveTab('taal')}
        />
        <TabButton
          id="pitch"
          title="Pitch Detection"
          icon="📊"
          active={activeTab === 'pitch'}
          onPress={() => setActiveTab('pitch')}
        />
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

// Individual training components
const SwarTraining = ({ isDarkMode }) => (
  <ScrollView style={styles.trainingContainer}>
    <Text style={[styles.trainingTitle, { color: '#FF6B35' }]}>🎯 SwaraTraining</Text>
    <Text style={[styles.trainingDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
      Master the seven fundamental notes of Indian classical music
    </Text>
    
    {/* Sa Setting */}
    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Set Your Sa</Text>
        <Text style={styles.exerciseBadge}>Basic</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Customize your base pitch frequency for personalized training
      </Text>
    </TouchableOpacity>

    {/* Note Training */}
    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Note Identification</Text>
        <Text style={styles.exerciseBadge}>Beginner</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Learn Sa-Re-Ga-Ma-Pa-Dha-Ni with interactive exercises
      </Text>
    </TouchableOpacity>

    {/* Interval Training */}
    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Interval Training</Text>
        <Text style={[styles.exerciseBadge, { backgroundColor: '#FF9500' }]}>Intermediate</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Practice relative distances between notes
      </Text>
    </TouchableOpacity>

    {/* Random Note Challenge */}
    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Random Note Challenge</Text>
        <Text style={[styles.exerciseBadge, { backgroundColor: '#FF4757' }]}>Advanced</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Match your voice to random notes in 5-second intervals
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

const RagaTraining = ({ isDarkMode }) => (
  <ScrollView style={styles.trainingContainer}>
    <Text style={[styles.trainingTitle, { color: '#FF6B35' }]}>🎼 Raga Practice</Text>
    <Text style={[styles.trainingDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
      Learn classical ragas with guided practice sessions
    </Text>
    
    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Yaman</Text>
        <Text style={styles.exerciseBadge}>Popular</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Evening raga • Kalyan thaat • Uses teevra Ma
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Bhupali</Text>
        <Text style={styles.exerciseBadge}>Beginner</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Pentatonic raga • Bilawal thaat • No Ma or Ni
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Bhairav</Text>
        <Text style={[styles.exerciseBadge, { backgroundColor: '#FF9500' }]}>Intermediate</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Morning raga • Uses komal Re and Dha
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

const TaalTraining = ({ isDarkMode }) => (
  <ScrollView style={styles.trainingContainer}>
    <Text style={[styles.trainingTitle, { color: '#FF6B35' }]}>🥁 Taal Training</Text>
    <Text style={[styles.trainingDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
      Master rhythm patterns and timing with tabla accompaniment
    </Text>
    
    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Teentaal</Text>
        <Text style={styles.exerciseBadge}>Popular</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        16 beats • Most common taal • X-2-0-3 pattern
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Keharwa</Text>
        <Text style={styles.exerciseBadge}>Beginner</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        8 beats • Light classical • X-0-X-0 pattern
      </Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.exerciseCard, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa' }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Dadra</Text>
        <Text style={[styles.exerciseBadge, { backgroundColor: '#FF9500' }]}>Intermediate</Text>
      </View>
      <Text style={[styles.exerciseDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        6 beats • Semi-classical • X-0-X pattern
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

const PitchDetection = ({ isDarkMode }) => {
  const {
    isRecording,
    hasPermission,
    currentPitch,
    audioLevel,
    error,
    toggleRecording,
    requestPermissions,
  } = useAudioRecorder();

  const handleRecordingToggle = async () => {
    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for pitch detection.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    await toggleRecording();
  };

  return (
    <View style={styles.trainingContainer}>
      <Text style={[styles.trainingTitle, { color: '#FF6B35' }]}>📊 Real-time Pitch Detection</Text>
      <Text style={[styles.trainingDescription, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Practice with live pitch feedback and accuracy measurement
      </Text>
      
      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Pitch Visualization */}
      <View style={styles.pitchContainer}>
        <PitchVisualizer pitch={currentPitch} isDarkMode={isDarkMode} />
        
        {/* Audio Level Indicator */}
        {isRecording && (
          <View style={styles.audioLevelContainer}>
            <Text style={[styles.audioLevelLabel, { color: isDarkMode ? '#fff' : '#000' }]}>Audio Level:</Text>
            <View style={styles.audioLevelBar}>
              <View 
                style={[
                  styles.audioLevelFill, 
                  { width: `${Math.min(Math.abs(audioLevel) * 2, 100)}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      {/* Recording Controls */}
      <TouchableOpacity
        style={[
          styles.recordButton,
          { backgroundColor: isRecording ? '#FF4757' : '#FF6B35' }
        ]}
        onPress={handleRecordingToggle}
        disabled={!hasPermission && isRecording}
      >
        <Text style={styles.recordButtonText}>
          {isRecording ? '⏹️ Stop Detection' : '🎤 Start Detection'}
        </Text>
      </TouchableOpacity>
      
      {!hasPermission && (
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermissions}
        >
          <Text style={styles.permissionButtonText}>
            🔒 Request Microphone Permission
          </Text>
        </TouchableOpacity>
      )}

      {/* Status */}
      <Text style={[styles.statusText, { color: isDarkMode ? '#ccc' : '#666' }]}>
        Status: {!hasPermission ? 'No microphone permission' : isRecording ? 'Detecting...' : 'Ready to detect'}
      </Text>
      
      {isRecording && (
        <Text style={[styles.instructionText, { color: isDarkMode ? '#aaa' : '#888' }]}>
          💡 Sing or play a note to see pitch detection in action!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  tabsContainer: {
    maxHeight: 120,
  },
  tabsContent: {
    paddingHorizontal: 20,
  },
  tabButton: {
    padding: 15,
    borderRadius: 15,
    marginRight: 15,
    minWidth: 120,
    alignItems: 'center',
  },
  activeTabButton: {
    transform: [{ scale: 1.05 }],
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  trainingContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  trainingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  trainingDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  exerciseCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseBadge: {
    backgroundColor: '#4ECDC4',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  exerciseDescription: {
    fontSize: 14,
  },
  // Pitch Detection Styles
  errorContainer: {
    backgroundColor: '#FF4757',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  pitchContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  audioLevelContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  audioLevelLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  audioLevelBar: {
    width: 200,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  audioLevelFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  recordButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    marginBottom: 15,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RiyaazScreen;
