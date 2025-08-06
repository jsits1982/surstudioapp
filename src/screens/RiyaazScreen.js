import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import useAudioRecorder from '../hooks/useAudioRecorder';
import PitchVisualizer from '../components/PitchVisualizer';

function RiyaazScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const {
    isRecording,
    hasPermission,
    currentPitch,
    audioLevel,
    error,
    toggleRecording,
    requestPermissions,
  } = useAudioRecorder();

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
  };

  const textStyle = {
    color: isDarkMode ? '#ffffff' : '#333333',
  };

  const handleRecordingToggle = async () => {
    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for pitch detection. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    await toggleRecording();
  };

  return (
    <View style={[styles.container, backgroundStyle]}>
      {/* Header */}
      <Text style={[styles.titleText, textStyle]}>Riyaaz Practice</Text>
      <Text style={[styles.subtitleText, textStyle]}>Real-time Pitch Detection</Text>
      <Text style={[styles.demoText, textStyle]}>🎵 Perfect your pitch</Text>
      
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
            <Text style={[styles.audioLevelLabel, textStyle]}>Audio Level:</Text>
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
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording ? styles.recordingButton : styles.idleButton
          ]}
          onPress={handleRecordingToggle}
          disabled={!hasPermission && isRecording}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '⏹️ Stop Practice' : '🎤 Start Practice'}
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
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, textStyle]}>
          Status: {!hasPermission ? 'No microphone permission' : isRecording ? 'Recording...' : 'Ready to practice'}
        </Text>
        
        {isRecording && (
          <Text style={[styles.instructionText, textStyle]}>
            💡 Sing or play a note to see pitch detection in action!
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  titleText: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  demoText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    maxWidth: '90%',
    marginVertical: 10,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  pitchContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    maxHeight: 300,
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
  controlsContainer: {
    alignItems: 'center',
  },
  recordButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    marginBottom: 15,
    minWidth: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  idleButton: {
    backgroundColor: '#4CAF50',
  },
  recordingButton: {
    backgroundColor: '#F44336',
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
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default RiyaazScreen;
