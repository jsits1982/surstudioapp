import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { PitchDetector as RNPitchDetector } from 'react-native-pitch-detector';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [currentPitch, setCurrentPitch] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);

  const pitchSubscription = useRef(null);

    // Request microphone permissions
  const requestPermissions = async () => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.MICROPHONE 
        : PERMISSIONS.ANDROID.RECORD_AUDIO;
      
      const result = await request(permission);
      const hasPermission = result === RESULTS.GRANTED;
      setHasPermission(hasPermission);
      return hasPermission;
    } catch (error) {
      console.error('Permission request failed:', error);
      setError('Failed to request microphone permission');
      setHasPermission(false);
      return false;
    }
  };

  // Start real-time pitch detection using react-native-pitch-detector
  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          setError('Microphone permission is required for pitch detection');
          return false;
        }
      }

      setError(null);
      
      // Set up pitch detection listener
      pitchSubscription.current = RNPitchDetector.addListener((data) => {
        if (data && data.frequency && data.frequency > 0) {
          // Just use the raw frequency data
          setCurrentPitch({
            frequency: data.frequency,
            confidence: data.confidence || 0.8, // Default confidence if not provided
            timestamp: Date.now()
          });
        }
        
        // Update audio level if available
        if (data && data.amplitude !== undefined) {
          setAudioLevel(data.amplitude * 100); // Convert to percentage
        }
      });
      
      // Start pitch detection
      await RNPitchDetector.start({
        android: {
          algorithm: 'YIN',
          sampleRate: 22050,
          bufferSize: 4096,
        },
        ios: {
          algorithm: 'YIN',
          bufferSize: 4096,
        }
      });
      
      setIsRecording(true);
      console.log('🎵 Real-time pitch detection started');
      
      return true;
    } catch (error) {
      console.error('Failed to start pitch detection:', error);
      setError('Failed to start pitch detection');
      setIsRecording(false);
      return false;
    }
  };

  // Stop pitch detection
  const stopRecording = async () => {
    try {
      setIsRecording(false);
      
      // Stop the pitch detector
      await RNPitchDetector.stop();
      
      // Remove the listener
      if (pitchSubscription.current) {
        pitchSubscription.current.remove();
        pitchSubscription.current = null;
      }
      
      setCurrentPitch(null);
      setAudioLevel(0);
      setError(null);
      
      console.log('🎵 Pitch detection stopped');
      
      return true;
    } catch (error) {
      console.error('Failed to stop pitch detection:', error);
      setError('Failed to stop pitch detection');
      return null;
    }
  };

  // Toggle recording
  const toggleRecording = async () => {
    if (isRecording) {
      return await stopRecording();
    } else {
      return await startRecording();
    }
  };

  // Initialize permissions on mount
  useEffect(() => {
    requestPermissions();
    
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (pitchSubscription.current) {
        pitchSubscription.current.remove();
      }
    };
  }, []);

  // Clean up when recording stops
  useEffect(() => {
    if (!isRecording) {
      setCurrentPitch(null);
      setAudioLevel(0);
    }
  }, [isRecording]);

  return {
    isRecording,
    hasPermission,
    currentPitch,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    requestPermissions,
  };
};

export default useAudioRecorder;
