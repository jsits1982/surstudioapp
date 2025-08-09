import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAudioRecorder from '../hooks/useAudioRecorder';
import { playSwaraTone, stopSwaraTone, setSwaraVolume } from '../utils/TanpuraAudio';
import raagData from '../data/raagData.json';

const { width, height } = Dimensions.get('window');

const RaagSadhana = ({ onBack, saFrequency, onSetSa }) => {
  // Main state
  const [gamePhase, setGamePhase] = useState('setup'); // 'setup', 'practice', 'completed'
  const [selectedRaag, setSelectedRaag] = useState(null);
  const [showRaagSelector, setShowRaagSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Progress state
  const [currentLevel, setCurrentLevel] = useState(1); // 1=vadi, 2=samvadi, 3=arohi, 4=avrohi, 5=pakad
  const [currentPhase, setCurrentPhase] = useState('listen'); // 'listen', 'practice', 'hold'
  const [levelScores, setLevelScores] = useState([0, 0, 0, 0, 0]); // Score for each level (0-5)
  const [currentLevelScore, setCurrentLevelScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [starCollectionMessage, setStarCollectionMessage] = useState('');
  const [showStarMessage, setShowStarMessage] = useState(false);
  
  // Audio & pitch detection
  const { currentPitch, isRecording, startRecording, stopRecording, hasPermission } = useAudioRecorder();
  const [isListeningPhase, setIsListeningPhase] = useState(false);
  const [targetNote, setTargetNote] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef(null);
  
  // Sequence handling (for arohi, avrohi, pakad)
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [sequenceNotes, setSequenceNotes] = useState([]);
  const [isSequenceMode, setIsSequenceMode] = useState(false);
  const [currentSequenceNote, setCurrentSequenceNote] = useState('');
  const [sequenceProgress, setSequenceProgress] = useState({ current: 0, total: 0 });
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef(new Animated.Value(0)).current;

  const LEVEL_NAMES = ['Vadi', 'Samvadi', 'Arohi', 'Avrohi', 'Pakad'];
  // Constants
  const HOLD_TIME = 1000; // 1 second
  const MATCH_TOLERANCE = 50; // cents (more lenient matching)

  // Note to frequency mapping (relative to Sa)
  const NOTE_RATIOS = {
    'S': 1.0,      // Sa
    'r': 16/15,    // Komal Re
    'R': 9/8,      // Re
    'g': 6/5,      // Komal Ga  
    'G': 5/4,      // Ga
    'm': 4/3,      // Ma
    'M': 45/32,    // Tivra Ma
    'P': 3/2,      // Pa
    'd': 8/5,      // Komal Dha
    'D': 5/3,      // Dha
    'n': 16/9,     // Komal Ni
    'N': 15/8,     // Ni
    "'": 2.0,      // Upper octave multiplier
    '.': 0.5,      // Lower octave multiplier
  };

  useEffect(() => {
    loadProgress();
    return () => {
      clearHoldTimer();
      stopSwaraTone();
      stopRecording(); // Also stop recording on unmount
    };
  }, []);

  // Stop audio when changing phases
  useEffect(() => {
    if (currentPhase === 'setup' || currentPhase === 'completed') {
      stopSwaraTone();
      stopRecording();
    }
  }, [currentPhase]);

  // Pitch matching logic
  useEffect(() => {
    if (currentPhase === 'practice' && targetNote && currentPitch?.frequency && saFrequency) {
      const targetFreq = getFrequencyForNote(targetNote);
      const deviation = Math.abs(currentPitch.frequency - targetFreq);
      const centsDeviation = Math.abs(1200 * Math.log2(currentPitch.frequency / targetFreq));
      
      const matching = centsDeviation < MATCH_TOLERANCE && currentPitch.confidence > 0.5;
      
      if (matching && !isMatching) {
        setIsMatching(true);
        startHoldTimer();
      } else if (!matching && isMatching) {
        setIsMatching(false);
        clearHoldTimer();
        setHoldProgress(0);
      }
    }
  }, [currentPitch, targetNote, currentPhase, saFrequency, isMatching]);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem('raagSadhanaProgress');
      if (saved) {
        const progress = JSON.parse(saved);
        setLevelScores(progress.levelScores || [0, 0, 0, 0, 0]);
      }
    } catch (error) {
      console.log('Error loading progress:', error);
    }
  };

  const saveProgress = async () => {
    try {
      const progress = {
        levelScores,
        selectedRaag: selectedRaag?.name,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem('raagSadhanaProgress', JSON.stringify(progress));
    } catch (error) {
      console.log('Error saving progress:', error);
    }
  };

  // Helper function to handle back navigation with cleanup
  const handleBackToMenu = () => {
    // Stop all audio and recording first
    stopSwaraTone();
    stopRecording();
    clearHoldTimer();
    
    // Then go back to menu
    onBack();
  };

  const getFrequencyForNote = (note) => {
    if (!saFrequency || !note) return 0;
    
    // Parse note with octave markers
    let noteValue = note;
    let octaveMultiplier = 1;
    
    // Handle octave markers
    if (note.includes("'")) {
      octaveMultiplier = Math.pow(2, note.split("'").length - 1);
      noteValue = note.replace(/'/g, '');
    } else if (note.includes('.')) {
      octaveMultiplier = Math.pow(0.5, note.split('.').length - 1);
      noteValue = note.replace(/\./g, '');
    }
    
    const ratio = NOTE_RATIOS[noteValue] || 1;
    return saFrequency * ratio * octaveMultiplier;
  };

  const parseSequence = (sequenceStr) => {
    if (!sequenceStr) return [];
    return sequenceStr.split(' ').filter(note => note.trim().length > 0);
  };

  const getCurrentLevelData = () => {
    if (!selectedRaag) return null;
    
    switch (currentLevel) {
      case 1: return { type: 'note', value: selectedRaag.vadi, name: 'Vadi' };
      case 2: return { type: 'note', value: selectedRaag.samvadi, name: 'Samvadi' };
      case 3: return { type: 'sequence', value: parseSequence(selectedRaag.arohi), name: 'Arohi' };
      case 4: return { type: 'sequence', value: parseSequence(selectedRaag.avrohi), name: 'Avrohi' };
      case 5: return { type: 'sequence', value: parseSequence(selectedRaag.pakad), name: 'Pakad' };
      default: return null;
    }
  };

  const startListenPhase = async () => {
    const levelData = getCurrentLevelData();
    if (!levelData) return;

    try {
      // Stop any existing audio first
      stopSwaraTone();
      stopRecording();
      
      setCurrentPhase('listen');
      setIsListeningPhase(true);
      setError(null);
      
      if (levelData.type === 'note') {
        // Play single note
        setTargetNote(levelData.value);
        const freq = getFrequencyForNote(levelData.value);
        if (freq > 0) {
          // Play tone and automatically stop it after 2 seconds
          playSwaraTone(freq, 2000);
          setTimeout(() => {
            stopSwaraTone(); // Ensure it stops
          }, 2100); // Slight delay to ensure cleanup
        } else {
          setError(`Invalid note: ${levelData.value}`);
          return;
        }
        
        setTimeout(() => {
          setIsListeningPhase(false);
          setCurrentPhase('practice');
          if (hasPermission) {
            startRecording();
          } else {
            setError('Microphone permission required');
          }
        }, 2000);
      } else {
        // Play sequence
        setIsSequenceMode(true);
        playSequence(levelData.value);
      }
    } catch (err) {
      console.error('Error in startListenPhase:', err);
      setError('Failed to start listening phase');
      stopSwaraTone(); // Stop audio on error
    }
  };

    const playSequence = async (sequence) => {
    if (!sequence || sequence.length === 0) {
      console.warn('Empty sequence provided to playSequence');
      return;
    }

    try {
      // Stop any existing audio first
      stopSwaraTone();
      
      setIsPlayingSequence(true);
      setCurrentSequenceIndex(0);
      
      for (let i = 0; i < sequence.length; i++) {
        setCurrentSequenceIndex(i);
        const note = sequence[i];
        const freq = getFrequencyForNote(note);
        
        if (freq > 0) {
          // Play each note for 1 second
          playSwaraTone(freq, 1000);
          
          // Wait for note to complete before playing next
          await new Promise((resolve) => {
            setTimeout(() => {
              stopSwaraTone(); // Ensure it stops
              resolve();
            }, 1100); // Slight overlap to ensure cleanup
          });
        }
      }
      
      // Sequence complete - stop audio and move to practice
      stopSwaraTone();
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
      setIsListeningPhase(false);
      setCurrentPhase('practice');
      
      // Initialize sequence progression for practice
      if (sequence && sequence.length > 0) {
        setCurrentSequenceIndex(0);
        setTargetNote(sequence[0]);
        setCurrentSequenceNote(sequence[0]);
        setSequenceProgress({ current: 1, total: sequence.length });
      }
      
      if (hasPermission) {
        startRecording();
      } else {
        setError('Microphone permission required');
      }
    } catch (err) {
      console.error('Error playing sequence:', err);
      setError('Failed to play sequence');
      stopSwaraTone(); // Stop audio on error
      setIsPlayingSequence(false);
      setCurrentSequenceIndex(-1);
    }
  };

  const startHoldTimer = () => {
    setHoldProgress(0);
    holdAnim.setValue(0);
    
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: HOLD_TIME,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleSuccessfulHold();
      }
    });
    
    // Update progress periodically
    const interval = setInterval(() => {
      setHoldProgress(prev => {
        const newProgress = Math.min(prev + (100 / (HOLD_TIME / 50)), 100);
        if (newProgress >= 100) {
          clearInterval(interval);
        }
        return newProgress;
      });
    }, 50);
    
    holdTimerRef.current = interval;
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdAnim.stopAnimation();
    setHoldProgress(0);
  };

  const handleSuccessfulHold = () => {
    if (isSequenceMode) {
      // Handle sequence progression
      const levelData = getCurrentLevelData();
      if (currentSequenceIndex < levelData.value.length - 1) {
        // Move to next note in sequence
        const nextIndex = currentSequenceIndex + 1;
        const nextNote = levelData.value[nextIndex];
        setCurrentSequenceIndex(nextIndex);
        setTargetNote(nextNote);
        setCurrentSequenceNote(nextNote);
        setSequenceProgress({ current: nextIndex + 1, total: levelData.value.length });
        setIsMatching(false);
        clearHoldTimer();
        
        // Show sequence progression message
        setStarCollectionMessage(`Note ${nextIndex + 1} of ${levelData.value.length}: ${nextNote}`);
        setShowStarMessage(true);
        setTimeout(() => setShowStarMessage(false), 2000);
        return;
      } else {
        // Completed the sequence, now practice full sequence
        // This is simplified - you could add more complex sequence validation
      }
    }

    const newScore = Math.min(currentLevelScore + 1, 5);
    setCurrentLevelScore(newScore);
    
    // Show star collection feedback
    const starsRemaining = 5 - newScore;
    const message = starsRemaining > 0 
      ? `⭐ Star collected! ${starsRemaining} more to go` 
      : `🎉 Level Complete! All stars collected!`;
    setStarCollectionMessage(message);
    setShowStarMessage(true);
    setTimeout(() => setShowStarMessage(false), 2000);
    
    // Update level scores
    const newLevelScores = [...levelScores];
    newLevelScores[currentLevel - 1] = newScore;
    setLevelScores(newLevelScores);
    
    // Reset for next attempt
    setIsMatching(false);
    clearHoldTimer();
    
    if (newScore >= 5) {
      // Level completed!
      handleLevelCompletion();
    } else {
      // Continue practicing
      showSuccessAnimation();
      setTimeout(() => {
        startListenPhase();
      }, 1500);
    }
    
    saveProgress();
  };

  const handleLevelCompletion = () => {
    setShowSuccess(true);
    stopRecording();
    stopSwaraTone(); // Stop any playing audio
    
    setTimeout(() => {
      setShowSuccess(false);
      if (currentLevel < 5) {
        // Move to next level
        const nextLevel = currentLevel + 1;
        setCurrentLevel(nextLevel);
        setCurrentLevelScore(0);
        setMistakes(0);
        setCurrentSequenceIndex(0);
        
        // Check if next level is sequence mode
        const nextLevelData = { 
          1: { type: 'note' }, 
          2: { type: 'note' }, 
          3: { type: 'sequence' }, 
          4: { type: 'sequence' }, 
          5: { type: 'sequence' } 
        }[nextLevel];
        setIsSequenceMode(nextLevelData.type === 'sequence');
        
        setTimeout(() => startListenPhase(), 1000);
      } else {
        // All levels completed!
        setGamePhase('completed');
      }
    }, 2000);
  };

  const handleMistake = () => {
    const newMistakes = mistakes + 1;
    setMistakes(newMistakes);
    
    if (newMistakes >= 3) {
      // Reset score
      setCurrentLevelScore(0);
      setMistakes(0);
      
      const newLevelScores = [...levelScores];
      newLevelScores[currentLevel - 1] = 0;
      setLevelScores(newLevelScores);
      
      Alert.alert(
        'Practice Reset',
        'Don\'t worry! Let\'s try again from the beginning. 💪',
        [{ text: 'Continue', onPress: () => setTimeout(() => startListenPhase(), 500) }]
      );
    } else {
      // Show mistake and continue
      setTimeout(() => startListenPhase(), 1000);
    }
    
    saveProgress();
  };

  const showSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderRaagSelector = () => {
    const raagNames = Object.keys(raagData).sort();
    
    return (
      <Modal visible={showRaagSelector} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRaagSelector(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Raag</Text>
          </View>
          
          <ScrollView style={styles.raagList}>
            {raagNames.map((raagName) => (
              <TouchableOpacity
                key={raagName}
                style={[
                  styles.raagItem,
                  selectedRaag?.name === raagName && styles.selectedRaagItem
                ]}
                onPress={() => {
                  setSelectedRaag({
                    name: raagName,
                    ...raagData[raagName]
                  });
                  setShowRaagSelector(false);
                }}
              >
                <Text style={styles.raagName}>{raagName}</Text>
                <Text style={styles.raagDetails}>
                  Vadi: {raagData[raagName].vadi} • Samvadi: {raagData[raagName].samvadi}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderSetupScreen = () => (
    <View style={styles.setupContainer}>
      <View style={styles.setupHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToMenu}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.setupTitle}>🏆 Raag Sadhana</Text>
        <Text style={styles.setupSubtitle}>Gamified Raag Mastery</Text>
      </View>

      <View style={styles.setupCard}>
        <Text style={styles.cardTitle}>🎯 Set Your Sa</Text>
        {saFrequency ? (
          <View style={styles.saInfo}>
            <Text style={styles.saValue}>{Math.round(saFrequency)} Hz</Text>
            <Text style={styles.saLabel}>Your Sa Frequency</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.noSaText}>Please set your Sa frequency first</Text>
            <TouchableOpacity
              style={styles.setSaButton}
              onPress={onSetSa}
            >
              <Text style={styles.setSaButtonText}>🎯 Set Sa Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.setupCard}>
        <Text style={styles.cardTitle}>🎵 Select Raag</Text>
        <TouchableOpacity
          style={styles.raagButton}
          onPress={() => setShowRaagSelector(true)}
        >
          <Text style={styles.raagButtonText}>
            {selectedRaag ? selectedRaag.name : 'Choose a Raag'}
          </Text>
        </TouchableOpacity>
        
        {selectedRaag && (
          <View style={styles.raagInfo}>
            <Text style={styles.raagInfoText}>Vadi: {selectedRaag.vadi}</Text>
            <Text style={styles.raagInfoText}>Samvadi: {selectedRaag.samvadi}</Text>
            <Text style={styles.raagInfoText}>Arohi: {selectedRaag.arohi}</Text>
            <Text style={styles.raagInfoText}>Avrohi: {selectedRaag.avrohi}</Text>
          </View>
        )}
      </View>

      {saFrequency && selectedRaag && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            setGamePhase('practice');
            setCurrentLevel(1);
            setCurrentLevelScore(0);
            setMistakes(0);
            setIsSequenceMode(false);
            setTimeout(() => startListenPhase(), 500);
          }}
        >
          <Text style={styles.startButtonText}>🚀 Start Sadhana</Text>
        </TouchableOpacity>
      )}

      {renderRaagSelector()}
    </View>
  );

  const renderPracticeScreen = () => {
    const levelData = getCurrentLevelData();
    if (!levelData) return null;

    const progressPercentage = (currentLevel - 1) / 5 * 100 + (currentLevelScore / 5) * 20;

    return (
      <View style={styles.practiceContainer}>
        <View style={styles.practiceHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToMenu}>
            <Text style={styles.backButtonText}>← Exit</Text>
          </TouchableOpacity>
          <Text style={styles.raagTitle}>{selectedRaag?.name}</Text>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>Level {currentLevel}/5: {levelData.name}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPercentage)}% Complete</Text>
        </View>

        <View style={styles.challengeCard}>
          <Text style={styles.challengeTitle}>
            {currentPhase === 'listen' ? `🔊 Listen to ${levelData.name}` : `🎤 Sing ${levelData.name}`}
          </Text>
          
          {levelData.type === 'note' && (
            <Text style={styles.targetNote}>{levelData.value}</Text>
          )}
          
          {levelData.type === 'sequence' && (
            <View style={styles.sequenceDisplay}>
              {levelData.value.map((note, index) => (
                <Text
                  key={index}
                  style={[
                    styles.sequenceNote,
                    index === currentSequenceIndex && styles.currentSequenceNote
                  ]}
                >
                  {note}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.feedbackSection}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Score:</Text>
            <View style={styles.scoreStars}>
              {[...Array(5)].map((_, i) => (
                <Text key={i} style={[
                  styles.star,
                  i < currentLevelScore && styles.filledStar
                ]}>
                  ⭐
                </Text>
              ))}
            </View>
            <Text style={styles.scoreText}>{currentLevelScore}/5</Text>
          </View>

          <View style={styles.mistakesRow}>
            <Text style={styles.mistakeLabel}>Mistakes:</Text>
            <View style={styles.mistakeIndicators}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={[
                  styles.mistakeIndicator,
                  i < mistakes && styles.mistakeMade
                ]} />
              ))}
            </View>
            <Text style={styles.mistakeText}>{mistakes}/3</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {currentPhase === 'practice' && (
          <View style={styles.practiceControls}>
            {/* Pitch Visualization Widget */}
            <View style={styles.pitchWidget}>
              <Text style={styles.targetNoteText}>
                {isSequenceMode && sequenceProgress.total > 1 
                  ? `${targetNote} (${sequenceProgress.current}/${sequenceProgress.total})`
                  : `Target: ${targetNote}`}
              </Text>
              
              {/* Pitch Meter */}
              <View style={styles.pitchMeter}>
                <View style={styles.pitchScale}>
                  {/* Target line */}
                  <View style={styles.targetLine} />
                  
                  {/* Current pitch indicator */}
                  {currentPitch?.frequency && saFrequency && (
                    <View
                      style={[
                        styles.pitchIndicator,
                        {
                          left: `${Math.min(Math.max(
                            ((currentPitch.frequency - getFrequencyForNote(targetNote)) / 50 + 1) * 50, 
                            0
                          ), 100)}%`,
                          backgroundColor: isMatching ? '#22c55e' : 
                                         Math.abs(1200 * Math.log2(currentPitch.frequency / getFrequencyForNote(targetNote))) < MATCH_TOLERANCE 
                                         ? '#f59e0b' : '#ef4444'
                        }
                      ]}
                    />
                  )}
                </View>
                
                {/* Pitch info */}
                <View style={styles.pitchInfo}>
                  <Text style={styles.pitchText}>
                    Your Pitch: {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)}Hz` : 'Listening...'}
                  </Text>
                  <Text style={styles.confidenceText}>
                    Confidence: {currentPitch?.confidence ? `${Math.round(currentPitch.confidence * 100)}%` : '0%'}
                  </Text>
                  {targetNote && saFrequency && (
                    <Text style={styles.deviationText}>
                      Target: {Math.round(getFrequencyForNote(targetNote))}Hz
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Status indicator */}
              <View style={[
                styles.statusIndicator,
                { backgroundColor: isMatching ? '#22c55e' : '#374151' }
              ]}>
                <Text style={styles.statusText}>
                  {isMatching ? '🎯 MATCHING!' : 
                   currentPitch?.frequency ? '🎵 Sing the note' : '🎤 Start singing'}
                </Text>
              </View>
            </View>

            {/* Hold Timer (only when matching) */}
            {isMatching && (
              <View style={styles.holdTimer}>
                <Text style={styles.holdText}>Hold it! {Math.round((1000 - holdProgress * 10))}ms</Text>
                <View style={styles.holdBar}>
                  <Animated.View
                    style={[
                      styles.holdBarFill,
                      {
                        width: holdAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.listenAgainButton}
              onPress={startListenPhase}
            >
              <Text style={styles.listenAgainText}>🔄 Listen Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleMistake}
            >
              <Text style={styles.skipText}>⏭️ Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {showSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successCard, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successText}>Excellent!</Text>
              <Text style={styles.successSubtext}>
                {currentLevelScore >= 5 ? 'Level Mastered!' : `${currentLevelScore}/5 Points`}
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Star Collection & Sequence Progress Message */}
        {showStarMessage && (
          <View style={styles.messageOverlay}>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{starCollectionMessage}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCompletedScreen = () => (
    <View style={styles.completedContainer}>
      <Text style={styles.completedTitle}>🎉 Raag Mastered!</Text>
      <Text style={styles.completedSubtitle}>Congratulations on completing {selectedRaag?.name}</Text>
      
      <View style={styles.completedStats}>
        {LEVEL_NAMES.map((name, index) => (
          <View key={index} style={styles.statRow}>
            <Text style={styles.statName}>{name}:</Text>
            <View style={styles.statStars}>
              {[...Array(5)].map((_, i) => (
                <Text key={i} style={[
                  styles.star,
                  i < levelScores[index] && styles.filledStar
                ]}>
                  ⭐
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.playAgainButton}
        onPress={() => {
          setGamePhase('setup');
          setCurrentLevel(1);
          setLevelScores([0, 0, 0, 0, 0]);
          setCurrentLevelScore(0);
          setMistakes(0);
        }}
      >
        <Text style={styles.playAgainText}>🎵 Practice Another Raag</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={handleBackToMenu}>
        <Text style={styles.backButtonText}>← Back to Menu</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render
  if (gamePhase === 'setup') {
    return renderSetupScreen();
  } else if (gamePhase === 'practice') {
    return renderPracticeScreen();
  } else if (gamePhase === 'completed') {
    return renderCompletedScreen();
  }

  return null;
};

const styles = StyleSheet.create({
  // Setup Screen Styles
  setupContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  backButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  setupTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  setupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  saInfo: {
    alignItems: 'center',
  },
  saValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  saLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  noSaText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
  },
  setSaButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  setSaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  raagButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  raagButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  raagInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  raagInfoText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    fontSize: 24,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 20,
  },
  raagList: {
    flex: 1,
    padding: 20,
  },
  raagItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedRaagItem: {
    borderColor: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  raagName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  raagDetails: {
    color: '#aaa',
    fontSize: 12,
  },

  // Practice Screen Styles
  practiceContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  raagTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressSection: {
    marginBottom: 30,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
  },
  progressText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  challengeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  targetNote: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  sequenceDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  sequenceNote: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#aaa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  currentSequenceNote: {
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },

  // Feedback Section
  feedbackSection: {
    marginBottom: 30,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#fff',
    marginRight: 12,
  },
  scoreStars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  star: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 2,
  },
  filledStar: {
    color: '#FFD700',
  },
  scoreText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  mistakesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mistakeLabel: {
    fontSize: 16,
    color: '#fff',
    marginRight: 12,
  },
  mistakeIndicators: {
    flexDirection: 'row',
    marginRight: 12,
  },
  mistakeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 2,
  },
  mistakeMade: {
    backgroundColor: '#ff6b6b',
  },
  mistakeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Practice Controls
  practiceControls: {
    alignItems: 'center',
  },
  holdTimer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  holdText: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
    marginBottom: 8,
  },
  holdBar: {
    width: 200,
    height: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  holdBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },

  // Pitch Widget Styles
  pitchWidget: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  targetNoteText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  pitchMeter: {
    marginBottom: 16,
  },
  pitchScale: {
    width: '100%',
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    position: 'relative',
    marginBottom: 12,
    justifyContent: 'center',
  },
  targetLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#FFD700',
    borderRadius: 1,
    marginLeft: -1.5,
  },
  pitchIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 12,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  pitchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pitchText: {
    fontSize: 12,
    color: '#aaa',
    flex: 1,
  },
  confidenceText: {
    fontSize: 12,
    color: '#aaa',
    flex: 1,
    textAlign: 'center',
  },
  deviationText: {
    fontSize: 12,
    color: '#aaa',
    flex: 1,
    textAlign: 'right',
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  listenAgainButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  listenAgainText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },

  // Success Overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Message Overlay (for star collection & sequence progress)
  messageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001, // Above success overlay
  },
  messageCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    minWidth: 200,
  },
  messageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },

  // Error Container
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Completed Screen
  completedContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 16,
  },
  completedSubtitle: {
    fontSize: 18,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 40,
  },
  completedStats: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  statStars: {
    flexDirection: 'row',
  },
  playAgainButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 20,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RaagSadhana;
