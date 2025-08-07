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
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAudioRecorder from '../hooks/useAudioRecorder';
import { Audio } from 'expo-av';
import { playSwaraTone, stopSwaraTone, setSwaraVolume } from '../utils/TanpuraAudio';
import raagNames from '../data/raagNames.json';

const { width, height } = Dimensions.get('window');

const RiyaazScreen = () => {
  // Game state
  const [gameState, setGameState] = useState('setup'); // 'setup', 'saDetection', 'playing', 'paused', 'completed'
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [userCoins, setUserCoins] = useState(50);
  const [streak, setStreak] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [difficulty, setDifficulty] = useState('easy'); // 'easy', 'medium', 'hard'
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy'); // For UI selection
  const [showHoldTimeControls, setShowHoldTimeControls] = useState(false); // For collapsible hold time
  
  // Raag practice specific state
  const [selectedRaag, setSelectedRaag] = useState(null);
  const [currentRaagSequence, setCurrentRaagSequence] = useState('arohi');
  const [raagSequenceNotes, setRaagSequenceNotes] = useState([]);
  const [showRaagSelector, setShowRaagSelector] = useState(false);
  const [completedRaags, setCompletedRaags] = useState([]);
  const [raagProgress, setRaagProgress] = useState({ arohi: false, avrohi: false, pakad: false });
  const [isLoadingRaag, setIsLoadingRaag] = useState(false);
  
  // Raag data and search state
  const [raagData, setRaagData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRaags, setFilteredRaags] = useState(raagNames);
  
  // Sa detection
  const [saFrequency, setSaFrequency] = useState(null);
  const [isDetectingSa, setIsDetectingSa] = useState(false);
  const [detectedSaFrequency, setDetectedSaFrequency] = useState(null);
  const [showPianoSelector, setShowPianoSelector] = useState(false);
  const [selectedPianoKey, setSelectedPianoKey] = useState(null);
  
  // Game mechanics
  const [currentSwaraIndex, setCurrentSwaraIndex] = useState(0);
  const [swaraSequence, setSwaraSequence] = useState(['Sa']); // Progressive sequence
  const [holdTime, setHoldTime] = useState(2); // Reduced to 2 seconds (was 3)
  const [currentHoldTime, setCurrentHoldTime] = useState(0);
  const [isHoldingCorrectly, setIsHoldingCorrectly] = useState(false);
  const [gameTimer, setGameTimer] = useState(0);
  
  // Volume control for swara tones
  const [swaraVolume, setSwaraVolumeState] = useState(0.5); // Default 50% volume
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  
  // Visual feedback
  const [pitchAccuracy, setPitchAccuracy] = useState(0);
  const [visualFeedback, setVisualFeedback] = useState('');
  const [strugglingTimer, setStrugglingTimer] = useState(0);
  
  // Animation values
  const scaleValue = new Animated.Value(1);
  const progressValue = new Animated.Value(0);
  const pulseValue = new Animated.Value(1);
  const fadeAnim = new Animated.Value(1);
  
  // Audio recording
  const { 
    isRecording, 
    currentPitch, 
    audioLevel, 
    error, 
    startRecording, 
    stopRecording,
    requestPermissions,
    hasPermission 
  } = useAudioRecorder();
  
  // Difficulty settings
  const difficultySettings = {
    easy: { 
      name: 'Easy', 
      deviation: 75, 
      description: '±75 cents',
      color: '#4CAF50',
      icon: '🟢'
    },
    medium: { 
      name: 'Medium', 
      deviation: 50, 
      description: '±50 cents',
      color: '#FF9800',
      icon: '🟡'
    },
    hard: { 
      name: 'Hard', 
      deviation: 25, 
      description: '±25 cents',
      color: '#F44336',
      icon: '🔴'
    }
  };
  
  // Remove audio hint system - not needed for professional UI
  
  // Game timer
  const gameTimerRef = useRef(null);
  const holdTimerRef = useRef(null);

  // Load user progress on mount
  useEffect(() => {
    loadUserProgress();
    loadCompletedRaags();
  }, []);

  // Search functionality for raags
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRaags(raagNames);
    } else {
      const filtered = raagNames.filter(raagName =>
        raagName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRaags(filtered);
    }
  }, [searchQuery]);

  // Game timer effect
  useEffect(() => {
    if (gameState === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setGameTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    }
    
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, [gameState]);

  // Sa detection effect
  useEffect(() => {
    if (isDetectingSa && currentPitch?.frequency && currentPitch?.confidence > 0.7) {
      const frequency = currentPitch.frequency;
      console.log('Detecting Sa - Frequency:', frequency, 'Confidence:', currentPitch.confidence);
      
      // Update detected frequency continuously for better feedback
      setDetectedSaFrequency(frequency);
    }
  }, [currentPitch, isDetectingSa]);

  // Pitch monitoring for game play
  useEffect(() => {
    if (gameState === 'playing' && currentPitch?.frequency && saFrequency) {
      const targetFrequency = getSwaraFrequency(swaraSequence[currentSwaraIndex]);
      const deviation = getPitchDeviation(currentPitch.frequency, targetFrequency);
      const accuracy = Math.max(0, 100 - Math.abs(deviation || 100));
      
      setPitchAccuracy(accuracy);
      
      // Use difficulty-based pitch matching
      const currentDifficultySettings = difficultySettings[difficulty];
      const isCorrect = Math.abs(deviation || 100) <= currentDifficultySettings.deviation;
      setIsHoldingCorrectly(isCorrect);
      
      if (isCorrect) {
        // Different feedback based on accuracy
        if (Math.abs(deviation || 100) <= 15) {
          setVisualFeedback('🎯 Perfect!');
        } else if (Math.abs(deviation || 100) <= 35) {
          setVisualFeedback('🎵 Very Good!');
        } else {
          setVisualFeedback('✅ Good Enough!');
        }
        // Start/continue hold timer
        if (!holdTimerRef.current) {
          startHoldTimer();
        }
        setStrugglingTimer(0); // Reset struggling timer when pitch is correct
      } else {
        setVisualFeedback('🎵 Find the note...');
        // Reset hold timer
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
          setCurrentHoldTime(0);
        }
      }
    }
  }, [currentPitch, gameState, currentSwaraIndex, saFrequency, difficulty]);

  // Play swara tone when starting a new swara
  useEffect(() => {
    if (gameState === 'playing' && saFrequency && swaraSequence.length > 0) {
      // Delay the tone slightly to allow for smooth transitions
      const timeoutId = setTimeout(() => {
        playCurrentSwaraTone();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentSwaraIndex, gameState]);

  const loadUserProgress = async () => {
    try {
      const savedLevel = await AsyncStorage.getItem('userLevel');
      const savedXP = await AsyncStorage.getItem('userXP');
      const savedCoins = await AsyncStorage.getItem('userCoins');
      const savedStreak = await AsyncStorage.getItem('streak');
      const savedSa = await AsyncStorage.getItem('userSaFrequency');
      const savedPianoKey = await AsyncStorage.getItem('selectedPianoKey');
      
      if (savedLevel) setUserLevel(parseInt(savedLevel));
      if (savedXP) setUserXP(parseInt(savedXP));
      if (savedCoins) setUserCoins(parseInt(savedCoins));
      if (savedStreak) setStreak(parseInt(savedStreak));
      
      if (savedPianoKey) {
        try {
          const pianoKeyData = JSON.parse(savedPianoKey);
          setSelectedPianoKey(pianoKeyData);
        } catch (error) {
          console.log('Error parsing saved piano key:', error);
        }
      }
      
      if (savedSa && parseFloat(savedSa) > 0) {
        const saFreq = parseFloat(savedSa);
        console.log('Loaded saved Sa frequency:', saFreq);
        setSaFrequency(saFreq);
        setGameState('setup'); // Skip Sa detection if already set
      } else {
        console.log('No saved Sa frequency, need to detect');
        setGameState('saDetection'); // Force Sa detection if not set
      }
    } catch (error) {
      console.log('Error loading progress:', error);
      setGameState('saDetection'); // Default to Sa detection on error
    }
  };

  const saveUserProgress = async () => {
    try {
      await AsyncStorage.setItem('userLevel', userLevel.toString());
      await AsyncStorage.setItem('userXP', userXP.toString());
      await AsyncStorage.setItem('userCoins', userCoins.toString());
      await AsyncStorage.setItem('streak', streak.toString());
      if (saFrequency) {
        await AsyncStorage.setItem('userSaFrequency', saFrequency.toString());
      }
      if (selectedPianoKey) {
        await AsyncStorage.setItem('selectedPianoKey', JSON.stringify(selectedPianoKey));
      }
    } catch (error) {
      console.log('Error saving progress:', error);
    }
  };

  // Game logic functions
  const getSwaraFrequency = (swaraName) => {
    // Handle Indian classical notation (S, R, r, G, g, M, m, P, D, d, N, n)
    const noteOffsets = {
      // Shuddha swaras (Natural)
      'S': 0,    // Sa - Tonic
      'R': 2,    // Re - Major 2nd  
      'G': 4,    // Ga - Major 3rd
      'M': 5,    // Ma - Perfect 4th
      'P': 7,    // Pa - Perfect 5th
      'D': 9,    // Dha - Major 6th
      'N': 11,   // Ni - Major 7th
      
      // Komal swaras (Flat)
      'r': 1,    // Komal Re - Minor 2nd
      'g': 3,    // Komal Ga - Minor 3rd  
      'm': 6,    // Tivra Ma - Augmented 4th
      'd': 8,    // Komal Dha - Minor 6th
      'n': 10,   // Komal Ni - Minor 7th
      
      // Octave variants
      'S\'': 12, // Upper Sa
      '\'N': -1, // Lower Ni
      '\'D': -3, // Lower Dha
      '\'P': -5, // Lower Pa
      '\'M': -7, // Lower Ma
      '\'G': -8, // Lower Ga  
      '\'R': -10, // Lower Re
      '\'S': -12, // Lower Sa
    };
    
    // Handle special notation like S', 'N, etc.
    let processedSwara = swaraName.trim();
    let semitoneOffset = noteOffsets[processedSwara];
    
    // If not found, try without apostrophes for basic notes
    if (semitoneOffset === undefined) {
      const cleanSwara = processedSwara.replace(/'/g, '');
      semitoneOffset = noteOffsets[cleanSwara] || 0;
    }
    
    return saFrequency * Math.pow(2, semitoneOffset / 12);
  };

  const getPitchDeviation = (currentFreq, targetFreq) => {
    if (!currentFreq || !targetFreq) return null;
    return Math.round(1200 * Math.log2(currentFreq / targetFreq));
  };

  // Raag management functions
  const loadRaagData = async (raagName) => {
    // Check if we already have this raag's data
    if (raagData[raagName]) {
      return raagData[raagName];
    }

    try {
      // Load the full raag data file
      const raagDataModule = await import('../data/raagData.json');
      const fullRaagData = raagDataModule.default;
      
      // Cache the specific raag data
      const specificRaagData = fullRaagData[raagName];
      if (specificRaagData) {
        setRaagData(prev => ({ ...prev, [raagName]: specificRaagData }));
        return specificRaagData;
      } else {
        throw new Error(`Raag ${raagName} not found in data`);
      }
    } catch (error) {
      console.error(`Error loading raag data for ${raagName}:`, error);
      Alert.alert('Error', `Failed to load raag data for ${raagName}`);
      return null;
    }
  };

  const selectRaag = async (raagName) => {
    // Show loading state
    setIsLoadingRaag(true);
    setShowRaagSelector(false);
    
    try {
      // Load raag data on demand
      const selectedRaagData = await loadRaagData(raagName);
      
      if (!selectedRaagData) {
        setIsLoadingRaag(false);
        return;
      }

      // Set the raag and initialize
      setSelectedRaag(raagName);
      setCurrentRaagSequence('arohi');
      setRaagProgress({ arohi: false, avrohi: false, pakad: false });
      
      // Update sequence from raag with loading state
      updateSequenceFromRaag(raagName, 'arohi', selectedRaagData);
    } catch (error) {
      console.error('Error selecting raag:', error);
      Alert.alert('Error', 'Failed to load raag. Please try again.');
    } finally {
      setIsLoadingRaag(false);
    }
  };

  const updateSequenceFromRaag = (raagName, sequenceType, raagDataObj = null) => {
    // Use provided data or try to get from cache
    const sourceData = raagDataObj || raagData[raagName];
    
    if (!sourceData || !sourceData[sequenceType]) {
      console.warn(`Raag ${raagName} or sequence ${sequenceType} not found`);
      return;
    }
    
    const sequenceString = sourceData[sequenceType];
    const notes = sequenceString.split(' ').filter(note => note.length > 0);
    setRaagSequenceNotes(notes);
    setSwaraSequence(notes);
    setCurrentSwaraIndex(0);
    
    // Reset game state completely for new sequence
    setCurrentHoldTime(0);
    setCurrentScore(0);
    progressValue.setValue(0);
    setPitchAccuracy(0);
    setIsHoldingCorrectly(false);
    setVisualFeedback('');
    
    // Clear any running timers
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const completeRaagSequence = async () => {
    const newProgress = { ...raagProgress };
    newProgress[currentRaagSequence] = true;
    setRaagProgress(newProgress);

    // Check if all sequences are completed
    if (newProgress.arohi && newProgress.avrohi && newProgress.pakad) {
      // Raag completed silently!
      const newCompletedRaags = [...completedRaags, selectedRaag];
      setCompletedRaags(newCompletedRaags);
      saveCompletedRaags(newCompletedRaags);
      
      // Stop the current practice and return to setup
      setGameState('setup');
      if (isRecording) {
        stopRecording();
      }
      stopSwaraTone();
      return;
    }

    // Move to next sequence automatically
    const sequences = ['arohi', 'avrohi', 'pakad'];
    const currentIndex = sequences.indexOf(currentRaagSequence);
    const nextSequence = sequences[currentIndex + 1];
    
    if (nextSequence) {
      // Reset game state before switching sequence
      setCurrentSwaraIndex(0);
      setCurrentHoldTime(0);
      progressValue.setValue(0);
      
      // Clear any running timers
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      
      setCurrentRaagSequence(nextSequence);
      // Make sure we have the raag data before updating sequence
      const selectedRaagData = await loadRaagData(selectedRaag);
      if (selectedRaagData) {
        updateSequenceFromRaag(selectedRaag, nextSequence, selectedRaagData);
        // Automatically start the next sequence
        setGameState('playing');
      }
    }
  };

  const saveCompletedRaags = async (completedRaagsList) => {
    try {
      await AsyncStorage.setItem('completedRaags', JSON.stringify(completedRaagsList));
    } catch (error) {
      console.error('Error saving completed raags:', error);
    }
  };

  const loadCompletedRaags = async () => {
    try {
      const saved = await AsyncStorage.getItem('completedRaags');
      if (saved) {
        setCompletedRaags(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading completed raags:', error);
    }
  };

  // Remove audio hint system functions - keeping clean professional UI

  const startHoldTimer = () => {
    if (holdTimerRef.current) return;
    
    holdTimerRef.current = setInterval(() => {
      setCurrentHoldTime(prev => {
        const newTime = prev + 0.1;
        
        // Update progress animation
        Animated.timing(progressValue, {
          toValue: (newTime / holdTime) * 100,
          duration: 100,
          useNativeDriver: false,
        }).start();
        
        // Check if hold time completed
        if (newTime >= holdTime) {
          completeCurrentSwara();
          return 0;
        }
        
        return newTime;
      });
    }, 100);
  };

  const completeCurrentSwara = () => {
    // Clear hold timer
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    // Add score based on accuracy
    const scoreGain = Math.round(pitchAccuracy * 10);
    setCurrentScore(prev => prev + scoreGain);
    
    // Success animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Move to next swara
    setTimeout(() => {
      if (currentSwaraIndex < swaraSequence.length - 1) {
        setCurrentSwaraIndex(prev => prev + 1);
        setCurrentHoldTime(0);
        progressValue.setValue(0);
      } else {
        // Level completed
        completeLevel();
      }
    }, 500);
  };

  const completeLevel = () => {
    // Check if we're in raag practice mode
    if (selectedRaag) {
      completeRaagSequence();
      return;
    }
    
    // Standard completion logic for non-raag mode
    setGameState('completed');
    
    // Award XP and coins
    const xpGain = Math.round(currentScore / 10);
    const coinGain = Math.round(currentScore / 50);
    
    setUserXP(prev => prev + xpGain);
    setUserCoins(prev => prev + coinGain);
    
    // Check for level up
    if (userXP + xpGain >= userLevel * 100) {
      setUserLevel(prev => prev + 1);
    }
    
    // Expand sequence for next level
    const allSwaras = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];
    if (swaraSequence.length < allSwaras.length) {
      setSwaraSequence(allSwaras.slice(0, swaraSequence.length + 1));
    }
    
    saveUserProgress();
  };

  const startSaDetection = async () => {
    try {
      if (!hasPermission) {
        console.log('Requesting microphone permissions...');
        await requestPermissions();
      }
      
      console.log('Starting Sa detection...');
      setIsDetectingSa(true);
      setDetectedSaFrequency(null);
      setGameState('saDetection');
      
      if (!isRecording) {
        console.log('Starting recording for Sa detection...');
        await startRecording();
      }
    } catch (error) {
      console.error('Error starting Sa detection:', error);
      Alert.alert('Error', 'Failed to start Sa detection. Please check microphone permissions.');
    }
  };

  const confirmSaFrequency = async () => {
    if (detectedSaFrequency) {
      console.log('Confirming Sa frequency:', detectedSaFrequency);
      setSaFrequency(detectedSaFrequency);
      setIsDetectingSa(false);
      setGameState('setup');
      
      // Save Sa frequency immediately
      try {
        await AsyncStorage.setItem('userSaFrequency', detectedSaFrequency.toString());
        console.log('Sa frequency saved:', detectedSaFrequency);
      } catch (error) {
        console.error('Error saving Sa frequency:', error);
      }
      
      if (isRecording) {
        stopRecording();
      }
    } else {
      Alert.alert('No Sa Detected', 'Please sing a clear Sa note and try again.');
    }
  };

  const showPianoKeySelector = () => {
    setShowPianoSelector(true);
    if (isRecording) {
      stopRecording();
    }
    setIsDetectingSa(false);
  };

  const selectPianoKey = async (keyName, frequency) => {
    console.log('Selected piano key:', keyName, 'Frequency:', frequency);
    const keyData = {
      name: keyName,
      frequency: frequency,
      octaveName: 'Piano Selected',
      octaveDescription: `${keyName} key`
    };
    
    setSelectedPianoKey(keyData);
    setSaFrequency(frequency);
    setShowPianoSelector(false);
    setGameState('setup');
    
    // Save Sa frequency and piano key immediately
    try {
      await AsyncStorage.setItem('userSaFrequency', frequency.toString());
      await AsyncStorage.setItem('selectedPianoKey', JSON.stringify(keyData));
      console.log('Piano Sa frequency saved:', frequency);
    } catch (error) {
      console.error('Error saving piano Sa frequency:', error);
    }
  };

  // Comprehensive piano keys from C2 to C5 for sliding interface
  const pianoKeys = [
    // C2 octave (very low)
    { name: 'C2', frequency: 65.41, isWhite: true },
    { name: 'C#2', frequency: 69.30, isWhite: false },
    { name: 'D2', frequency: 73.42, isWhite: true },
    { name: 'D#2', frequency: 77.78, isWhite: false },
    { name: 'E2', frequency: 82.41, isWhite: true },
    { name: 'F2', frequency: 87.31, isWhite: true },
    { name: 'F#2', frequency: 92.50, isWhite: false },
    { name: 'G2', frequency: 98.00, isWhite: true },
    { name: 'G#2', frequency: 103.83, isWhite: false },
    { name: 'A2', frequency: 110.00, isWhite: true },
    { name: 'A#2', frequency: 116.54, isWhite: false },
    { name: 'B2', frequency: 123.47, isWhite: true },
    
    // C3 octave (low)
    { name: 'C3', frequency: 130.81, isWhite: true },
    { name: 'C#3', frequency: 138.59, isWhite: false },
    { name: 'D3', frequency: 146.83, isWhite: true },
    { name: 'D#3', frequency: 155.56, isWhite: false },
    { name: 'E3', frequency: 164.81, isWhite: true },
    { name: 'F3', frequency: 174.61, isWhite: true },
    { name: 'F#3', frequency: 185.00, isWhite: false },
    { name: 'G3', frequency: 196.00, isWhite: true },
    { name: 'G#3', frequency: 207.65, isWhite: false },
    { name: 'A3', frequency: 220.00, isWhite: true },
    { name: 'A#3', frequency: 233.08, isWhite: false },
    { name: 'B3', frequency: 246.94, isWhite: true },
    
    // C4 octave (middle)
    { name: 'C4', frequency: 261.63, isWhite: true },
    { name: 'C#4', frequency: 277.18, isWhite: false },
    { name: 'D4', frequency: 293.66, isWhite: true },
    { name: 'D#4', frequency: 311.13, isWhite: false },
    { name: 'E4', frequency: 329.63, isWhite: true },
    { name: 'F4', frequency: 349.23, isWhite: true },
    { name: 'F#4', frequency: 369.99, isWhite: false },
    { name: 'G4', frequency: 392.00, isWhite: true },
    { name: 'G#4', frequency: 415.30, isWhite: false },
    { name: 'A4', frequency: 440.00, isWhite: true },
    { name: 'A#4', frequency: 466.16, isWhite: false },
    { name: 'B4', frequency: 493.88, isWhite: true },
    
    // C5 octave (high)
    { name: 'C5', frequency: 523.25, isWhite: true },
    { name: 'C#5', frequency: 554.37, isWhite: false },
    { name: 'D5', frequency: 587.33, isWhite: true },
    { name: 'D#5', frequency: 622.25, isWhite: false },
    { name: 'E5', frequency: 659.25, isWhite: true },
    { name: 'F5', frequency: 698.46, isWhite: true },
    { name: 'F#5', frequency: 739.99, isWhite: false },
    { name: 'G5', frequency: 783.99, isWhite: true },
    { name: 'G#5', frequency: 830.61, isWhite: false },
    { name: 'A5', frequency: 880.00, isWhite: true },
    { name: 'A#5', frequency: 932.33, isWhite: false },
    { name: 'B5', frequency: 987.77, isWhite: true },
  ];

  const startGame = async (gameDifficulty = null) => {
    if (!saFrequency) {
      Alert.alert('Set Sa First', 'Please detect your Sa frequency before starting the game.');
      return;
    }
    
    if (!hasPermission) {
      await requestPermissions();
    }
    
    // Use the passed difficulty, or the selected difficulty from UI, or default to 'easy'
    const gameplayDifficulty = gameDifficulty || selectedDifficulty || 'easy';
    
    // Set difficulty and reset game state
    setDifficulty(gameplayDifficulty);
    setCurrentSwaraIndex(0);
    setCurrentHoldTime(0);
    setCurrentScore(0);
    setGameTimer(0);
    progressValue.setValue(0);
    
    setGameState('playing');
    
    if (!isRecording) {
      startRecording();
    }
  };

  // Function to play the tone for the current swara
  const playCurrentSwaraTone = async () => {
    if (gameState === 'playing' && saFrequency && swaraSequence.length > 0) {
      try {
        const currentSwara = swaraSequence[currentSwaraIndex];
        const targetFrequency = getSwaraFrequency(currentSwara);
        
        // Play tanpura-style tone for 2.0 seconds
        await playSwaraTone(targetFrequency, 2.0);
        
        console.log(`Playing tone for swara: ${currentSwara} at ${Math.round(targetFrequency)}Hz`);
      } catch (error) {
        console.error('Error playing swara tone:', error);
      }
    }
  };

  const selectDifficulty = (difficultyKey) => {
    setSelectedDifficulty(difficultyKey);
  };

  const adjustHoldTime = (change) => {
    setHoldTime(prev => Math.max(1, Math.min(5, prev + change))); // Between 1-5 seconds
  };

  const adjustSwaraVolume = (change) => {
    const newVolume = Math.max(0, Math.min(1, swaraVolume + change));
    setSwaraVolumeState(newVolume);
    setSwaraVolume(newVolume); // Update the audio engine volume
  };

  const pauseGame = () => {
    setGameState('paused');
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    // Stop any playing swara tones
    stopSwaraTone();
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('setup');
    setCurrentSwaraIndex(0);
    setCurrentHoldTime(0);
    setCurrentScore(0);
    setGameTimer(0);
    setSwaraSequence(['Sa']);
    progressValue.setValue(0);
    
    // Stop any playing swara tones
    stopSwaraTone();
    
    if (isRecording) {
      stopRecording();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.appTitle}>🎵 Swara Sadhana</Text>
        <Text style={styles.appSubtitle}>Master Your Voice</Text>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.userStats}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>L{userLevel}</Text>
          </View>
          <View style={styles.xpDisplay}>
            <Text style={styles.xpText}>{userXP % 100}/100</Text>
            <View style={styles.xpBarMini}>
              <View 
                style={[
                  styles.xpBarFillMini, 
                  { width: `${Math.min((userXP % 100), 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => Alert.alert('Settings', 'Settings panel coming soon!')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSaDetection = () => (
    <View style={styles.saDetectionContainer}>
      {!showPianoSelector ? (
        <>
          <Text style={styles.saDetectionTitle}>🎯 Set Your Sa</Text>
          <Text style={styles.gameSubtitle}>
            Sing your comfortable Sa note to set your base frequency
          </Text>
          
          <View style={styles.saDetectionVisual}>
            <Animated.View style={[
              styles.microphoneIcon,
              { transform: [{ scale: pulseValue }] }
            ]}>
              <Text style={styles.microphoneEmoji}>🎤</Text>
            </Animated.View>
            
            {/* Current pitch display */}
            <View style={styles.currentPitchDisplay}>
              <Text style={styles.currentPitchLabel}>Current Pitch:</Text>
              <Text style={styles.currentPitchValue}>
                {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)} Hz` : '-- Hz'}
              </Text>
              <Text style={styles.confidenceLevel}>
                Confidence: {currentPitch?.confidence ? `${Math.round(currentPitch.confidence * 100)}%` : '0%'}
              </Text>
            </View>
            
            {isDetectingSa && (
              <View style={styles.listeningIndicator}>
                <Text style={styles.listeningText}>🎵 Listening...</Text>
                {detectedSaFrequency && (
                  <View style={styles.detectedContainer}>
                    <Text style={styles.detectedFreq}>
                      Detected Sa: {Math.round(detectedSaFrequency)} Hz
                    </Text>
                    <Text style={styles.detectionInstruction}>
                      Sing steady Sa for 2-3 seconds, then confirm
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {!isDetectingSa ? (
            <View style={styles.saInputMethods}>
              <TouchableOpacity
                style={styles.startDetectionButton}
                onPress={startSaDetection}
              >
                <Text style={styles.buttonText}>🎯 Detect from Voice</Text>
              </TouchableOpacity>
              
              <View style={styles.orDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity
                style={styles.pianoKeyButton}
                onPress={showPianoKeySelector}
              >
                <Text style={styles.buttonText}>🎹 Select from Piano</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detectionControls}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { opacity: detectedSaFrequency ? 1 : 0.5 }
                ]}
                onPress={confirmSaFrequency}
                disabled={!detectedSaFrequency}
              >
                <Text style={styles.buttonText}>
                  ✅ Confirm Sa ({detectedSaFrequency ? Math.round(detectedSaFrequency) : '--'} Hz)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsDetectingSa(false);
                  setDetectedSaFrequency(null);
                  setGameState('setup');
                  if (isRecording) stopRecording();
                }}
              >
                <Text style={styles.buttonText}>❌ Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Explanatory paragraph */}
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>🎼 Why Voice-Detected Sa?</Text>
            <Text style={styles.explanationText}>
              In Indian classical music tradition, your Sa (Shadja) is determined by your natural vocal range and comfort zone. 
              Unlike Western music which uses fixed pitches, Indian classical music is relative - your personal Sa becomes 
              the foundation for all other swaras. This approach follows the traditional guru-shishya method where each 
              singer finds their unique vocal sweet spot, ensuring comfortable practice without vocal strain.
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.pianoSelectorContainer}>
          <Text style={styles.pianoSelectorTitle}>🎹 Select Your Sa Note</Text>
          <Text style={styles.pianoSelectorSubtitle}>
            Slide horizontally to browse all keys from C2 to C5
          </Text>
          
          {/* Sliding Piano Keyboard */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.pianoScrollView}
            contentContainerStyle={styles.pianoScrollContent}
          >
            {pianoKeys.map((key, index) => (
              key.isWhite ? (
                <View key={key.name} style={styles.pianoKeyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.whiteKey,
                      selectedPianoKey?.name === key.name && styles.selectedWhiteKey
                    ]}
                    onPress={() => selectPianoKey(key.name, key.frequency)}
                  >
                    <Text style={[
                      styles.whiteKeyText,
                      selectedPianoKey?.name === key.name && styles.selectedWhiteKeyText
                    ]}>
                      {key.name}
                    </Text>
                    <Text style={[
                      styles.whiteKeyFreq,
                      selectedPianoKey?.name === key.name && styles.selectedWhiteKeyFreq
                    ]}>
                      {Math.round(key.frequency)}Hz
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Black key overlay */}
                  {index < pianoKeys.length - 1 && pianoKeys[index + 1] && !pianoKeys[index + 1].isWhite && (
                    <TouchableOpacity
                      style={[
                        styles.blackKey,
                        selectedPianoKey?.name === pianoKeys[index + 1].name && styles.selectedBlackKey
                      ]}
                      onPress={() => selectPianoKey(pianoKeys[index + 1].name, pianoKeys[index + 1].frequency)}
                    >
                      <Text style={[
                        styles.blackKeyText,
                        selectedPianoKey?.name === pianoKeys[index + 1].name && styles.selectedBlackKeyText
                      ]}>
                        {pianoKeys[index + 1].name}
                      </Text>
                      <Text style={[
                        styles.blackKeyFreq,
                        selectedPianoKey?.name === pianoKeys[index + 1].name && styles.selectedBlackKeyFreq
                      ]}>
                        {Math.round(pianoKeys[index + 1].frequency)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            ))}
          </ScrollView>
          
          {/* Range indicators */}
          <View style={styles.rangeIndicators}>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeLabel}>C2</Text>
              <Text style={styles.rangeDesc}>Very Low</Text>
              <Text style={styles.rangeFreq}>65 Hz</Text>
            </View>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeLabel}>A3</Text>
              <Text style={styles.rangeDesc}>Common</Text>
              <Text style={styles.rangeFreq}>220 Hz</Text>
            </View>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeLabel}>A4</Text>
              <Text style={styles.rangeDesc}>Standard</Text>
              <Text style={styles.rangeFreq}>440 Hz</Text>
            </View>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeLabel}>C5</Text>
              <Text style={styles.rangeDesc}>High</Text>
              <Text style={styles.rangeFreq}>523 Hz</Text>
            </View>
          </View>
          
          <View style={styles.pianoInstructions}>
            <Text style={styles.instructionText}>
              💡 Slide the piano to find your comfortable Sa frequency. Most singers use A3 (220Hz) to A4 (440Hz).
            </Text>
            {selectedPianoKey && (
              <Text style={styles.selectedKeyInfo}>
                Selected: {selectedPianoKey.name} • {Math.round(selectedPianoKey.frequency)} Hz
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.backToVoiceButton}
            onPress={() => setShowPianoSelector(false)}
          >
            <Text style={styles.buttonText}>🎤 Back to Voice Detection</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Debug info */}
      {__DEV__ && !showPianoSelector && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>Recording: {isRecording ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Has Permission: {hasPermission ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Current Frequency: {currentPitch?.frequency || 'None'}</Text>
          <Text style={styles.debugText}>Confidence: {currentPitch?.confidence || 'None'}</Text>
          <Text style={styles.debugText}>Detecting: {isDetectingSa ? 'Yes' : 'No'}</Text>
        </View>
      )}
    </View>
  );

  const renderSetupScreen = () => (
    <View style={styles.setupContainer}>
      <Text style={styles.setupTitle}>🏆 Swara Sadhana</Text>
      <Text style={styles.gameSubtitle}>
        Hold each swara for {holdTime} seconds to progress
      </Text>
      
      {saFrequency ? (
        <View style={styles.saDisplayContainer}>
          <Text style={styles.saDisplayLabel}>Your Sa Frequency:</Text>
          <Text style={styles.saDisplayValue}>{Math.round(saFrequency)} Hz</Text>
          {selectedPianoKey && (
            <Text style={styles.pianoKeyLabel}>
              Piano Key: {selectedPianoKey.name} • {selectedPianoKey.octaveName}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.changeSaSetupButton}
            onPress={() => setGameState('saDetection')}
          >
            <Text style={styles.changeSaText}>🔄 Change Sa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noSaContainer}>
          <Text style={styles.noSaText}>⚠️ Sa not set</Text>
          <TouchableOpacity
            style={styles.setSaButton}
            onPress={() => setGameState('saDetection')}
          >
            <Text style={styles.buttonText}>🎯 Set Sa First</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Raag Selector */}
      <View style={styles.raagSelectorContainer}>
        <Text style={styles.raagSelectorTitle}>🎵 Select Raag</Text>
        <TouchableOpacity
          style={styles.raagSelectorButton}
          onPress={() => setShowRaagSelector(true)}
        >
          <Text style={styles.raagSelectorText}>
            {isLoadingRaag 
              ? '⏳ Loading Raag...' 
              : selectedRaag 
                ? `📜 ${selectedRaag}` 
                : '📜 Choose a Raag to Practice'}
          </Text>
          {selectedRaag && !isLoadingRaag && (
            <View style={styles.raagProgressContainer}>
              <Text style={styles.raagProgressText}>
                {currentRaagSequence.toUpperCase()} • 
                Progress: {Object.values(raagProgress).filter(Boolean).length}/3
              </Text>
              {completedRaags.includes(selectedRaag) && (
                <Text style={styles.completedBadge}>✅ MASTERED</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
        {selectedRaag && (
          <TouchableOpacity
            style={styles.clearRaagButton}
            onPress={() => {
              setSelectedRaag(null);
              setSwaraSequence(['S']);
              setCurrentSwaraIndex(0);
            }}
          >
            <Text style={styles.clearRaagText}>❌ Clear Selection</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.gameStats}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statValue}>{swaraSequence.length}</Text>
          <Text style={styles.statLabel}>Swaras</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statValue}>{holdTime}s</Text>
          <Text style={styles.statLabel}>Hold Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={styles.statValue}>{userLevel}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.startSadhanaButton,
          { 
            backgroundColor: difficultySettings[selectedDifficulty].color,
            opacity: (saFrequency && selectedRaag && !isLoadingRaag) ? 1 : 0.5 
          }
        ]}
        onPress={() => startGame(selectedDifficulty)}
        disabled={!saFrequency || !selectedRaag || isLoadingRaag}
      >
        <Text style={styles.startSadhanaText}>
          {!selectedRaag ? 'Select a Raag First' : 
           isLoadingRaag ? 'Loading Raag...' : 'Start Sadhana'}
        </Text>
        <Text style={styles.startSadhanaSubtext}>
          {!selectedRaag 
            ? 'Choose a raag to begin practice' 
            : isLoadingRaag
              ? 'Please wait while raag loads'
              : `${difficultySettings[selectedDifficulty].name} Mode`}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.difficultyTitle}>🎮 Choose Difficulty Level</Text>
      
      <View style={styles.difficultyContainer}>
        <View style={styles.difficultyButtons}>
          {Object.entries(difficultySettings).map(([key, settings]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.smallDifficultyButton,
                { 
                  borderColor: settings.color,
                  backgroundColor: selectedDifficulty === key ? `${settings.color}25` : `${settings.color}10`,
                  opacity: (saFrequency && selectedRaag && !isLoadingRaag) ? 1 : 0.5 
                }
              ]}
              onPress={() => selectDifficulty(key)}
              disabled={!saFrequency || !selectedRaag || isLoadingRaag}
            >
              <Text style={styles.smallDifficultyIcon}>{settings.icon}</Text>
              <Text style={[styles.smallDifficultyName, { color: settings.color }]}>
                {settings.name}
              </Text>
              <Text style={styles.smallDifficultyDescription}>
                {settings.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Hold Time Adjustment */}
      <View style={styles.holdTimeContainer}>
        <TouchableOpacity 
          style={styles.holdTimeHeader}
          onPress={() => setShowHoldTimeControls(!showHoldTimeControls)}
        >
          <View style={styles.holdTimeHeaderContent}>
            <Text style={styles.holdTimeLabel}>Hold Time: {holdTime}s</Text>
            <Text style={styles.holdTimeToggle}>
              {showHoldTimeControls ? '▲' : '▼'}
            </Text>
          </View>
          <Text style={styles.holdTimeHeaderDescription}>
            Tap to adjust timing (currently {holdTime} seconds)
          </Text>
        </TouchableOpacity>
        
        {showHoldTimeControls && (
          <View style={styles.holdTimeControlsContainer}>
            <View style={styles.holdTimeControls}>
              <TouchableOpacity 
                style={[styles.holdTimeButton, { opacity: holdTime <= 1 ? 0.5 : 1 }]}
                onPress={() => adjustHoldTime(-0.5)}
                disabled={holdTime <= 1}
              >
                <Text style={styles.holdTimeButtonText}>-</Text>
              </TouchableOpacity>
              
              <View style={styles.holdTimeDisplay}>
                <Text style={styles.holdTimeValue}>{holdTime}s</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.holdTimeButton, { opacity: holdTime >= 5 ? 0.5 : 1 }]}
                onPress={() => adjustHoldTime(0.5)}
                disabled={holdTime >= 5}
              >
                <Text style={styles.holdTimeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.holdTimeDescription}>
              Time required to hold each swara (1-5 seconds)
            </Text>
          </View>
        )}
      </View>
      
      {/* Volume Control */}
      <View style={styles.holdTimeContainer}>
        <TouchableOpacity 
          style={styles.holdTimeHeader}
          onPress={() => setShowVolumeControls(!showVolumeControls)}
        >
          <View style={styles.holdTimeHeaderContent}>
            <Text style={styles.holdTimeLabel}>Swara Volume: {Math.round(swaraVolume * 100)}%</Text>
            <Text style={styles.holdTimeToggle}>
              {showVolumeControls ? '▲' : '▼'}
            </Text>
          </View>
          <Text style={styles.holdTimeHeaderDescription}>
            Tap to adjust swara tone volume (currently {Math.round(swaraVolume * 100)}%)
          </Text>
        </TouchableOpacity>
        
        {showVolumeControls && (
          <View style={styles.holdTimeControlsContainer}>
            <View style={styles.holdTimeControls}>
              <TouchableOpacity 
                style={[styles.holdTimeButton, { opacity: swaraVolume <= 0 ? 0.5 : 1 }]}
                onPress={() => adjustSwaraVolume(-0.1)}
                disabled={swaraVolume <= 0}
              >
                <Text style={styles.holdTimeButtonText}>-</Text>
              </TouchableOpacity>
              
              <View style={styles.holdTimeDisplay}>
                <Text style={styles.holdTimeValue}>{Math.round(swaraVolume * 100)}%</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.holdTimeButton, { opacity: swaraVolume >= 1 ? 0.5 : 1 }]}
                onPress={() => adjustSwaraVolume(0.1)}
                disabled={swaraVolume >= 1}
              >
                <Text style={styles.holdTimeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.holdTimeDescription}>
              Volume level for swara reference tones (0-100%)
            </Text>
            <TouchableOpacity
              style={[styles.holdTimeButton, { marginTop: 10, paddingHorizontal: 20 }]}
              onPress={() => {
                // Test the current volume by playing Sa tone
                if (saFrequency) {
                  playSwaraTone(saFrequency, 1.0);
                }
              }}
            >
              <Text style={[styles.holdTimeButtonText, { fontSize: 14 }]}>🔊 Test</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Empty content to prevent clipping */}
      <View style={styles.bottomSpacer} />
    </View>
  );

  const renderRaagSelectorModal = () => (
    <Modal
      visible={showRaagSelector}
      animationType="slide"
      onRequestClose={() => {
        setShowRaagSelector(false);
        setSearchQuery(''); // Reset search when closing
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🎵 Select Raag</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowRaagSelector(false);
              setSearchQuery(''); // Reset search when closing
            }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search raags..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
        
        {/* Results count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredRaags.length} raags found
          </Text>
        </View>
        
        <ScrollView style={styles.raagList} keyboardShouldPersistTaps="handled">
          {filteredRaags.map((raagName) => (
            <TouchableOpacity
              key={raagName}
              style={[
                styles.raagItem,
                completedRaags.includes(raagName) && styles.completedRaagItem
              ]}
              onPress={() => selectRaag(raagName)}
            >
              <View style={styles.raagItemContent}>
                <Text style={styles.raagName}>
                  {completedRaags.includes(raagName) ? '✅ ' : '📜 '}
                  {raagName}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredRaags.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No raags found</Text>
              <Text style={styles.noResultsSubtext}>
                Try a different search term
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Animated background particles for immersive experience
  const renderAnimatedBackground = () => {
    const particles = [];
    for (let i = 0; i < 5; i++) {
      particles.push(
        <Animated.View
          key={i}
          style={[
            styles.backgroundParticle,
            {
              left: `${Math.random() * 90}%`,
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, -50],
                }),
              }],
            }
          ]}
        />
      );
    }
    return (
      <View style={styles.backgroundContainer}>
        {particles}
      </View>
    );
  };

  const renderGameScreen = () => {
    const currentSwara = swaraSequence[currentSwaraIndex];
    const progress = (currentHoldTime / holdTime) * 100;
    
    return (
      <View style={styles.gameContainer}>
        {/* Compact header with level and settings */}
        <View style={styles.compactGameHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.compactTitleText}>Swar Sadhana</Text>
            <View style={styles.levelAndDifficultyRow}>
              <Text style={styles.levelIndicator}>Level {userLevel} • Basic</Text>
              <View style={styles.difficultyIndicator}>
                <Text style={styles.currentDifficultyIcon}>
                  {difficultySettings[difficulty].icon}
                </Text>
                <Text style={[
                  styles.currentDifficultyText,
                  { color: difficultySettings[difficulty].color }
                ]}>
                  {difficultySettings[difficulty].name}
                </Text>
              </View>
            </View>
            
            {/* Stats section directly below title */}
            <View style={styles.inlineStatsSection}>
              <View style={styles.inlineStatCard}>
                <Text style={styles.inlineStatValue}>{streak}</Text>
                <Text style={styles.inlineStatLabel}>Streak</Text>
              </View>
              <View style={styles.inlineStatCard}>
                <Text style={styles.inlineStatValue}>{userCoins}</Text>
                <Text style={styles.inlineStatLabel}>Coins</Text>
              </View>
              <View style={styles.inlineStatCard}>
                <Text style={styles.inlineStatValue}>{currentScore}</Text>
                <Text style={styles.inlineStatLabel}>Score</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.homeButton}
              onPress={resetGame}
            >
              <Text style={styles.homeIcon}>🏠</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerSettingsButton}
              onPress={() => Alert.alert('Settings', 'Settings panel coming soon!')}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Compact Current Swara Display with Sequence */}
        <View style={styles.compactSwaraCard}>
          <Text style={styles.currentSwaraLabel}>Current Swara</Text>
          <View style={styles.currentSwaraContainer}>
            <Animated.Text 
              style={[
                styles.compactCurrentSwaraText,
                { transform: [{ scale: scaleValue }] }
              ]}
            >
              {currentSwara}
            </Animated.Text>
            <TouchableOpacity
              style={styles.playTanpuraButton}
              onPress={playCurrentSwaraTone}
            >
              <Text style={styles.playTanpuraIcon}>🔊</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.compactProgressText}>
            {currentSwaraIndex + 1} of {swaraSequence.length}
          </Text>
          
          {/* Raag Sequence Label */}
          {selectedRaag && (
            <View style={styles.sequenceLabelContainer}>
              <Text style={styles.sequenceLabel}>
                {selectedRaag} • {currentRaagSequence.toUpperCase()}
              </Text>
              <View style={styles.sequenceProgressDots}>
                <View style={[
                  styles.sequenceDot,
                  { backgroundColor: raagProgress.arohi ? '#4CAF50' : (currentRaagSequence === 'arohi' ? '#FF6B35' : '#666') }
                ]} />
                <View style={[
                  styles.sequenceDot,
                  { backgroundColor: raagProgress.avrohi ? '#4CAF50' : (currentRaagSequence === 'avrohi' ? '#FF6B35' : '#666') }
                ]} />
                <View style={[
                  styles.sequenceDot,
                  { backgroundColor: raagProgress.pakad ? '#4CAF50' : (currentRaagSequence === 'pakad' ? '#FF6B35' : '#666') }
                ]} />
              </View>
            </View>
          )}
          
          {/* Sequence Progress directly below current swara */}
          <View style={styles.inlineSequenceRow}>
            {swaraSequence.map((swara, index) => (
              <View 
                key={index} 
                style={[
                  styles.inlineSequenceItem,
                  {
                    backgroundColor: index === currentSwaraIndex ? '#FF6B35' :
                                   index < currentSwaraIndex ? '#4CAF50' : '#444'
                  }
                ]}
              >
                <Text style={styles.inlineSequenceText}>{swara}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Progress and Frequency Section */}
        <View style={styles.mainGameSection}>
          {/* Hold Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Hold Progress</Text>
            <View style={styles.progressCircleContainer}>
              <View style={styles.progressCircle}>
                <View style={styles.progressBackground} />
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      borderColor: isHoldingCorrectly ? '#4CAF50' : '#FF6B35',
                      transform: [{
                        rotate: progressValue.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0deg', '360deg'],
                        })
                      }]
                    }
                  ]} 
                />
                <View style={styles.progressCenter}>
                  <Text style={styles.progressTime}>
                    {Math.max(0, holdTime - currentHoldTime).toFixed(1)}
                  </Text>
                  <Text style={styles.progressLabel}>seconds</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Frequency Matching */}
          <View style={styles.frequencySection}>
            <Text style={styles.sectionTitle}>Pitch Match</Text>
            <View style={styles.frequencyDisplay}>
              <View style={styles.frequencyBar}>
                <Text style={styles.frequencyLabel}>Target</Text>
                <View style={styles.frequencyBarContainer}>
                  <View 
                    style={[
                      styles.frequencyBarFill,
                      styles.targetBar,
                      { 
                        height: `${Math.min(100, Math.max(10, 
                          ((getSwaraFrequency(currentSwara) - 150) / 400) * 100
                        ))}%` 
                      }
                    ]}
                  />
                </View>
                <Text style={styles.frequencyValue}>
                  {Math.round(getSwaraFrequency(currentSwara))} Hz
                </Text>
              </View>

              <View style={styles.frequencyBar}>
                <Text style={styles.frequencyLabel}>Your Voice</Text>
                <View style={styles.frequencyBarContainer}>
                  <View 
                    style={[
                      styles.frequencyBarFill,
                      styles.currentBar,
                      { 
                        height: `${Math.min(100, Math.max(10, 
                          currentPitch?.frequency ? ((currentPitch.frequency - 150) / 400) * 100 : 0
                        ))}%`,
                        backgroundColor: pitchAccuracy > 70 ? '#4CAF50' : 
                                       pitchAccuracy > 50 ? '#FFC107' : '#F44336',
                      }
                    ]}
                  />
                </View>
                <Text style={styles.frequencyValue}>
                  {currentPitch?.frequency ? Math.round(currentPitch.frequency) : 0} Hz
                </Text>
              </View>
            </View>

            {/* Pitch Deviation */}
            <View style={styles.deviationDisplay}>
              <Text style={styles.deviationLabel}>Deviation:</Text>
              <Text style={[
                styles.deviationValue,
                { 
                  color: Math.abs(getPitchDeviation(currentPitch?.frequency, getSwaraFrequency(currentSwara)) || 0) <= 25 ? '#4CAF50' : 
                        Math.abs(getPitchDeviation(currentPitch?.frequency, getSwaraFrequency(currentSwara)) || 0) <= 50 ? '#FFC107' : '#F44336'
                }
              ]}>
                {currentPitch?.frequency && saFrequency ? 
                  `${getPitchDeviation(currentPitch.frequency, getSwaraFrequency(currentSwara)) > 0 ? '+' : ''}${Math.round(getPitchDeviation(currentPitch.frequency, getSwaraFrequency(currentSwara)) || 0)} cents` 
                  : '-- cents'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Accuracy Bar */}
        <View style={styles.accuracySection}>
          <Text style={styles.sectionTitle}>Pitch Accuracy</Text>
          <View style={styles.accuracyBarContainer}>
            <View 
              style={[
                styles.accuracyBarFill,
                { 
                  width: `${pitchAccuracy}%`,
                  backgroundColor: pitchAccuracy > 70 ? '#4CAF50' : 
                                 pitchAccuracy > 50 ? '#FFC107' : '#F44336',
                }
              ]}
            />
          </View>
          <Text style={styles.accuracyText}>{Math.round(pitchAccuracy)}% accuracy</Text>
        </View>

        {/* Feedback */}
        <View style={styles.feedbackSection}>
          <Text style={[
            styles.feedbackText,
            { 
              color: isHoldingCorrectly ? '#4CAF50' : '#FFC107',
            }
          ]}>
            {visualFeedback}
          </Text>
        </View>
      </View>
    );
  };

  const renderPausedScreen = () => (
    <View style={styles.pausedContainer}>
      <Text style={styles.pausedTitle}>⏸️ Game Paused</Text>
      <Text style={styles.pausedScore}>Score: {currentScore}</Text>
      
      <View style={styles.pausedControls}>
        <TouchableOpacity style={styles.resumeButton} onPress={resumeGame}>
          <Text style={styles.buttonText}>▶️ Resume</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
          <Text style={styles.buttonText}>🏠 Main Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompletedScreen = () => (
    <View style={styles.completedContainer}>
      <Text style={styles.completedTitle}>🎉 Level Complete!</Text>
      <Text style={styles.finalScore}>Final Score: {currentScore}</Text>
      
      <View style={styles.rewardsDisplay}>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardIcon}>⭐</Text>
          <Text style={styles.rewardText}>+{Math.round(currentScore / 10)} XP</Text>
        </View>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardIcon}>🪙</Text>
          <Text style={styles.rewardText}>+{Math.round(currentScore / 50)} Coins</Text>
        </View>
      </View>
      
      <View style={styles.completedControls}>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={() => startGame()} // Continue with same difficulty
        >
          <Text style={styles.buttonText}>🚀 Continue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.mainMenuButton} onPress={resetGame}>
          <Text style={styles.buttonText}>🏠 Main Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Pulse animation for microphone
  useEffect(() => {
    if (isDetectingSa) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseValue.setValue(1);
    }
  }, [isDetectingSa]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    // Set initial volume
    setSwaraVolume(swaraVolume);
    
    return () => {
      // Stop any playing tones on cleanup
      stopSwaraTone();
    };
  }, []);

  const renderContent = () => {
    switch (gameState) {
      case 'saDetection':
        return renderSaDetection();
      case 'setup':
        return renderSetupScreen();
      case 'playing':
        return renderGameScreen();
      case 'paused':
        return renderPausedScreen();
      case 'completed':
        return renderCompletedScreen();
      default:
        return renderSetupScreen();
    }
  };

  return (
    <View style={styles.container}>
      {renderAnimatedBackground()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
      
      {renderRaagSelectorModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 40,
  },
  
  // Settings button - refined
  topRightSettings: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Compact game header
  compactGameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
    paddingHorizontal: 8,
  },

  headerLeft: {
    flex: 1,
  },
  compactTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
    letterSpacing: 0.5,
  },
  levelIndicator: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
    fontWeight: '500',
  },
  headerSettingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsIcon: {
    fontSize: 16,
    color: '#fff',
  },
  
  // Compact Swara Card
  compactSwaraCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  currentSwaraLabel: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  compactCurrentSwaraText: {
    fontSize: 48,
    color: '#FF6B35',
    fontWeight: '800',
    marginBottom: 4,
  },
  currentSwaraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  playTanpuraButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  playTanpuraIcon: {
    fontSize: 16,
  },
  compactProgressText: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '400',
    marginBottom: 12,
  },
  
  // Inline sequence progress
  inlineSequenceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  inlineSequenceItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inlineSequenceText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  
  // Sa detection new elements
  saInputMethods: {
    alignItems: 'center',
    gap: 16,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  orText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  pianoKeyButton: {
    backgroundColor: '#666',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#666',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  explanationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  explanationTitle: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
    fontWeight: '400',
    textAlign: 'justify',
  },
  
  // Piano Selector Styles
  pianoSelectorContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 10,
  },
  pianoSelectorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 10,
  },
  pianoSelectorSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '400',
  },
  pianoScrollView: {
    marginVertical: 15,
  },
  pianoScrollContent: {
    paddingHorizontal: 10,
    alignItems: 'flex-end',
  },
  pianoKeyContainer: {
    position: 'relative',
    marginRight: 2,
  },
  whiteKey: {
    width: 50,
    height: 140,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedWhiteKey: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  whiteKeyText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedWhiteKeyText: {
    color: 'white',
  },
  whiteKeyFreq: {
    color: '#666',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedWhiteKeyFreq: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  blackKey: {
    position: 'absolute',
    top: 0,
    right: -18,
    width: 36,
    height: 95,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    zIndex: 10,
  },
  selectedBlackKey: {
    backgroundColor: '#FF6B35',
  },
  blackKeyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedBlackKeyText: {
    color: 'white',
  },
  blackKeyFreq: {
    color: '#ccc',
    fontSize: 8,
    marginTop: 3,
    textAlign: 'center',
  },
  selectedBlackKeyFreq: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  rangeIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 15,
  },
  rangeItem: {
    alignItems: 'center',
  },
  rangeLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  rangeDesc: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 1,
  },
  rangeFreq: {
    color: '#FF6B35',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 0,
  },
  pianoInstructions: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    maxWidth: 300,
  },
  instructionText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '400',
  },
  selectedKeyInfo: {
    fontSize: 14,
    color: '#FF6B35',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  backToVoiceButton: {
    backgroundColor: '#666',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#666',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Professional game title (removed - now using compact header)
  
  // Current Swara Display Card (removed - now using compact card)
  
  // Main Game Section
  mainGameSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  
  // Progress Section
  progressSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  progressCircleContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 100,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 3,
    borderColor: '#333',
  },
  progressFill: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent',
  },
  progressCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTime: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
    fontWeight: '400',
  },
  
  // Frequency Section
  frequencySection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  frequencyDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 12,
  },
  frequencyBar: {
    alignItems: 'center',
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 10,
    color: '#ccc',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  frequencyBarContainer: {
    width: 24,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  frequencyBarFill: {
    width: '100%',
    borderRadius: 12,
    minHeight: 6,
  },
  targetBar: {
    backgroundColor: '#FF6B35',
  },
  currentBar: {
    // backgroundColor set dynamically
  },
  frequencyValue: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  deviationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviationLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '500',
  },
  deviationValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Accuracy Section
  accuracySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  accuracyBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accuracyBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  accuracyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  
  // Feedback Section
  feedbackSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Game Stats Section
  gameStatsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  // Game Controls
  gameControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  changeSaButton: {
    backgroundColor: '#666',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  // Sa Detection Screen
  saDetectionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  saDetectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
  },
  gameSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    fontWeight: '400',
  },
  saDetectionVisual: {
    alignItems: 'center',
    marginBottom: 40,
  },
  microphoneIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  microphoneEmoji: {
    fontSize: 80,
  },
  currentPitchDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currentPitchLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    fontWeight: '500',
  },
  currentPitchValue: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: '700',
    marginBottom: 5,
  },
  confidenceLevel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  listeningIndicator: {
    alignItems: 'center',
  },
  listeningText: {
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 15,
    fontWeight: '600',
  },
  detectedContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  detectedFreq: {
    fontSize: 20,
    color: '#FF6B35',
    fontWeight: '700',
    marginBottom: 8,
  },
  detectionInstruction: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    fontWeight: '400',
  },
  debugInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 3,
    fontWeight: '400',
  },
  startDetectionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  detectionControls: {
    flexDirection: 'row',
    gap: 15,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#F44336',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  // Setup Screen
  setupContainer: {
    flex: 1,
    paddingVertical: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  setupTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
    marginTop:0,
  },
  saDisplayContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  saDisplayLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    fontWeight: '500',
  },
  saDisplayValue: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: '700',
    marginBottom: 10,
  },
  pianoKeyLabel: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 8,
  },
  changeSaSetupButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  changeSaText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  noSaContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  noSaText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 15,
    fontWeight: '600',
  },
  setSaButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#F44336',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sequenceContainer: {
    marginBottom: 30,
  },
  sequenceTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  swaraSequenceDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  swaraChip: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 2,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  swaraChipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  inlineStatsSection: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  inlineStatCard: {
    alignItems: 'center',
  },
  inlineStatValue: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '700',
  },
  inlineStatLabel: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  levelAndDifficultyRow: {
    flexDirection: 'column',
    gap: 4,
  },
  difficultyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentDifficultyIcon: {
    fontSize: 12,
  },
  currentDifficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {
    fontSize: 18,
  },
  difficultyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  difficultyContainer: {
    width: '100%',
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  difficultyButton: {
    width: '28%',
    minHeight: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  difficultyName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  difficultyDescription: {
    fontSize: 8,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 10,
  },
  
  // Small difficulty selection buttons
  smallDifficultyButton: {
    width: '28%',
    minHeight: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDifficultyIcon: {
    fontSize: 12,
    marginBottom: 2,
  },
  smallDifficultyName: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 1,
    textAlign: 'center',
  },
  smallDifficultyDescription: {
    fontSize: 7,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 8,
  },
  
  // Start Sadhana button
  startSadhanaButton: {
    width: '100%',
    minHeight: 60,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  startSadhanaText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    color: '#fff',
  },
  startSadhanaSubtext: {
    fontSize: 12,
    textAlign: 'center',
    color: '#fff',
    opacity: 0.9,
  },
  
  // Bottom spacer to prevent clipping
  bottomSpacer: {
    height: 80,
    width: '100%',
  },
  
  // Hold Time Adjustment
  holdTimeContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  holdTimeHeader: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#222',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
  holdTimeHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  holdTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  holdTimeToggle: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  holdTimeHeaderDescription: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  holdTimeControlsContainer: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  holdTimeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  holdTimeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
  },
  holdTimeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  holdTimeDisplay: {
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    alignItems: 'center',
  },
  holdTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  holdTimeDescription: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 5,
  },
  startGameButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startGameText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Game Container
  gameContainer: {
    flex: 1,
    paddingVertical: 0,
    marginTop: 0,
    paddingTop: 0,
  },
  
  // Paused Screen
  pausedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  pausedTitle: {
    fontSize: 32,
    color: '#FF9800',
    fontWeight: '700',
    marginBottom: 20,
  },
  pausedScore: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 40,
    fontWeight: '600',
  },
  pausedControls: {
    gap: 20,
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  
  // Completed Screen
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  completedTitle: {
    fontSize: 32,
    color: '#4CAF50',
    fontWeight: '700',
    marginBottom: 20,
  },
  finalScore: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 30,
    fontWeight: '700',
  },
  rewardsDisplay: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 40,
  },
  rewardItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 15,
    minWidth: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rewardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  rewardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedControls: {
    gap: 15,
  },
  nextLevelButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  mainMenuButton: {
    backgroundColor: '#666',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#666',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Error
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Animated Background
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundParticle: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#FF6B35',
    borderRadius: 1,
    opacity: 0.1,
  },
  
  // Raag Practice Mode Styles
  raagModeHeader: {
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  backButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  raagInfoContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  raagTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 10,
  },
  raagDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  raagDetail: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  raagDetailValue: {
    color: '#fff',
    fontWeight: '600',
  },
  currentSequenceText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  sequenceHighlight: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  // Raag Selector Styles
  raagSelectorContainer: {
    marginVertical: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  raagSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
  },
  raagSelectorButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  raagSelectorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  raagProgressContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  raagProgressText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  completedBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  clearRaagButton: {
    marginTop: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  clearRaagText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
  },
  closeButton: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  raagList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  raagItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedRaagItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  raagItemContent: {
    flex: 1,
  },
  raagName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  raagDetails: {
    marginBottom: 5,
  },
  raagDetail: {
    fontSize: 14,
    color: '#ccc',
  },
  sequencePreview: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  raagPreview: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Sequence label styles
  sequenceLabelContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sequenceLabel: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 4,
  },
  sequenceProgressDots: {
    flexDirection: 'row',
    gap: 6,
  },
  sequenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: 10,
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  resultsText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#aaa',
  },
});

export default RiyaazScreen;
