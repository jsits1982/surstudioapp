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
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNIap from 'react-native-iap';
import useAudioRecorder from '../hooks/useAudioRecorder';
import { playSwaraTone, stopSwaraTone, setSwaraVolume } from '../utils/TanpuraAudio';
import raagNames from '../data/raagNames.json';
import RaagSadhana from './RaagSadhana';

const { width, height } = Dimensions.get('window');

// In-App Purchase Configuration
const PREMIUM_PRODUCT_ID = 'surstudio_premium_unlock'; // Configure this in App Store/Play Store
const IAP_SKUS = Platform.select({
  ios: [PREMIUM_PRODUCT_ID],
  android: [PREMIUM_PRODUCT_ID],
});

const RiyaazScreen = () => {
  // Game state
  const [gameState, setGameState] = useState('setup'); // 'setup', 'saDetection', 'playing', 'paused', 'completed'
  const [practiceMode, setPracticeMode] = useState(null); // 'raag' or 'freeform'
  const [showHoldTimeControls, setShowHoldTimeControls] = useState(false); // For collapsible hold time
  
  // Premium features state
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // In-App Purchase state
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [products, setProducts] = useState([]);
  const [purchaseError, setPurchaseError] = useState(null);
  
  // Raag practice specific state
  const [selectedRaag, setSelectedRaag] = useState(null);
  const [currentRaagSequence, setCurrentRaagSequence] = useState('arohi');
  const [raagSequenceNotes, setRaagSequenceNotes] = useState([]);
  const [showRaagSelector, setShowRaagSelector] = useState(false);
  const [completedRaags, setCompletedRaags] = useState([]);
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
  const [swaraSequence, setSwaraSequence] = useState(['S']); // Single swara for free practice
  const [holdTime, setHoldTime] = useState(3); // Hold time in seconds
  const [currentHoldTime, setCurrentHoldTime] = useState(0);
  const [isHoldingCorrectly, setIsHoldingCorrectly] = useState(false);
  const [gameTimer, setGameTimer] = useState(0);
  
  // Volume control for swara tones
  const [swaraVolume, setSwaraVolumeState] = useState(0.5); // Default 50% volume
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  
  // Visual feedback
  const [pitchAccuracy, setPitchAccuracy] = useState(0);
  const [visualFeedback, setVisualFeedback] = useState('');
  
  // Pitch stability tracking
  const [pitchHistory, setPitchHistory] = useState([]);
  const [pitchStability, setPitchStability] = useState(0);
  const [stabilityFeedback, setStabilityFeedback] = useState('');
  
  // Tolerance adjustment state
  const [tolerance, setTolerance] = useState(50); // Default 50 cents
  const [toleranceLevel, setToleranceLevel] = useState('Medium');
  
  // Current singing swara detection
  const [userCurrentSwara, setUserCurrentSwara] = useState(null);
  
  // Free practice mode state
  const [selectedFreeSwara, setSelectedFreeSwara] = useState(null); // Single swara for free practice
  
  // User progress tracking
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  

  
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
  
  // Premium features
  const loadPremiumStatus = async () => {
    try {
      const premium = await AsyncStorage.getItem('isPremium');
      if (premium) {
        setIsPremium(JSON.parse(premium));
      }
    } catch (error) {
      console.log('Error loading premium status:', error);
    }
  };

  // Initialize In-App Purchases
  const initializeIAP = async () => {
    try {
      const result = await RNIap.initConnection();
      console.log('IAP Connection result:', result);
      
      // Get available products
      if (IAP_SKUS) {
        const availableProducts = await RNIap.getProducts({ skus: IAP_SKUS });
        setProducts(availableProducts);
        console.log('Available products:', availableProducts);
      }
      
      // Check for any pending purchases
      await checkPendingPurchases();
      
    } catch (err) {
      console.warn('IAP initialization error:', err);
      // Fall back to development mode
      if (__DEV__) {
        console.log('Running in development mode - IAP not required');
      }
    }
  };

  // Check for pending/unfinished purchases
  const checkPendingPurchases = async () => {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      console.log('Available purchases:', purchases);
      
      for (const purchase of purchases) {
        if (purchase.productId === PREMIUM_PRODUCT_ID) {
          // User has already purchased premium
          await finalizePurchase(purchase);
          break;
        }
      }
    } catch (err) {
      console.warn('Error checking pending purchases:', err);
    }
  };

  // Finalize purchase and unlock premium
  const finalizePurchase = async (purchase) => {
    try {
      // Verify purchase with your server here if needed
      console.log('Finalizing purchase:', purchase);
      
      // Unlock premium features
      setIsPremium(true);
      await AsyncStorage.setItem('isPremium', JSON.stringify(true));
      await AsyncStorage.setItem('purchaseToken', purchase.purchaseToken || purchase.transactionReceipt);
      
      // Finish the purchase on the platform
      await RNIap.finishTransaction(purchase, false);
      
      console.log('Purchase finalized successfully');
      return true;
    } catch (error) {
      console.error('Error finalizing purchase:', error);
      return false;
    }
  };

  // Handle purchase process
  const purchasePremium = async () => {
    if (isProcessingPurchase) return;
    
    setIsProcessingPurchase(true);
    setPurchaseError(null);
    
    try {
      // Check if we have the product available
      const premiumProduct = products.find(p => p.productId === PREMIUM_PRODUCT_ID);
      if (!premiumProduct && !__DEV__) {
        throw new Error('Premium product not available');
      }
      
      // In development mode, simulate purchase
      if (__DEV__ && !premiumProduct) {
        console.log('Development mode: Simulating purchase');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
        setIsPremium(true);
        await AsyncStorage.setItem('isPremium', JSON.stringify(true));
        setShowUpgradeModal(false);
        Alert.alert('Success!', 'Welcome to Swara Sadhana Premium! All features unlocked.');
        return;
      }
      
      // Request purchase
      const purchase = await RNIap.requestPurchase({
        sku: PREMIUM_PRODUCT_ID,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
      
      console.log('Purchase successful:', purchase);
      
      // Finalize the purchase
      const success = await finalizePurchase(purchase);
      
      if (success) {
        setShowUpgradeModal(false);
        Alert.alert('Success!', 'Welcome to Swara Sadhana Premium! All features unlocked.');
      } else {
        throw new Error('Failed to finalize purchase');
      }
      
    } catch (err) {
      console.error('Purchase error:', err);
      
      let errorMessage = 'Purchase failed. Please try again.';
      
      if (err.code === 'E_USER_CANCELLED') {
        errorMessage = 'Purchase cancelled by user.';
      } else if (err.code === 'E_PAYMENT_INVALID') {
        errorMessage = 'Invalid payment method. Please check your payment settings.';
      } else if (err.code === 'E_NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setPurchaseError(errorMessage);
      
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', errorMessage);
      }
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  // Restore purchases (for iOS mainly)
  const restorePurchases = async () => {
    try {
      setIsProcessingPurchase(true);
      const purchases = await RNIap.getAvailablePurchases();
      
      let premiumFound = false;
      for (const purchase of purchases) {
        if (purchase.productId === PREMIUM_PRODUCT_ID) {
          await finalizePurchase(purchase);
          premiumFound = true;
          break;
        }
      }
      
      if (premiumFound) {
        setShowUpgradeModal(false);
        Alert.alert('Success!', 'Premium features have been restored!');
      } else {
        Alert.alert('No Purchases', 'No previous premium purchases found.');
      }
      
    } catch (err) {
      console.error('Restore purchases error:', err);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const upgradeToPremium = async () => {
    await purchasePremium();
  };

  // Debug functions for testing (development only)
  const togglePremiumForTesting = async () => {
    if (!__DEV__) return;
    
    try {
      const newPremiumStatus = !isPremium;
      setIsPremium(newPremiumStatus);
      await AsyncStorage.setItem('isPremium', JSON.stringify(newPremiumStatus));
      Alert.alert(
        'Debug Mode', 
        `Premium status changed to: ${newPremiumStatus ? 'PREMIUM' : 'FREE'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error toggling premium status:', error);
    }
  };

  const resetAllData = async () => {
    if (!__DEV__) return;
    
    try {
      await AsyncStorage.multiRemove([
        'isPremium',
        'userLevel', 
        'userXP',
        'completedRaags',
        'userSaFrequency',
        'selectedPianoKey',
        'purchaseToken'
      ]);
      
      // Reset state
      setIsPremium(false);
      setUserLevel(1);
      setUserXP(0);
      setCompletedRaags([]);
      setSaFrequency(null);
      setSelectedPianoKey(null);
      setGameState('saDetection');
      
      Alert.alert('Debug Mode', 'All user data has been reset!');
    } catch (error) {
      console.error('Error resetting data:', error);
    }
  };
  
  // Game timer
  const gameTimerRef = useRef(null);
  const holdTimerRef = useRef(null);

  // Load user progress on mount
  useEffect(() => {
    loadUserProgress();
    loadCompletedRaags();
    loadPremiumStatus();
    initializeIAP();
  }, []);

  // Cleanup IAP connection on unmount
  useEffect(() => {
    return () => {
      RNIap.endConnection();
    };
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
      const targetFrequency = getSwaraFrequency(swaraSequence[currentSwaraIndex], {
        sequence: swaraSequence,
        position: currentSwaraIndex
      });
      const deviation = getPitchDeviation(currentPitch.frequency, targetFrequency);
      // Calculate accuracy based on dynamic tolerance
      const accuracy = Math.max(0, 100 - (Math.abs(deviation || 100) * 100 / tolerance));
      
      setPitchAccuracy(accuracy);
      
      // Detect which swara user is currently singing
      detectUserSwara(currentPitch.frequency);
      
      // Update pitch history for stability calculation
      setPitchHistory(prev => {
        const newHistory = [...prev, currentPitch.frequency].slice(-20); // Keep last 20 readings
        const stability = calculatePitchStability(newHistory);
        setPitchStability(stability);
        setStabilityFeedback(getStabilityFeedback(stability));
        return newHistory;
      });
      
      // Use tolerance-based pitch matching
      const isCorrect = Math.abs(deviation || 100) <= tolerance;
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
  }, [currentPitch, gameState, currentSwaraIndex, saFrequency, tolerance]);

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
      const savedSa = await AsyncStorage.getItem('userSaFrequency');
      const savedPianoKey = await AsyncStorage.getItem('selectedPianoKey');
      
      if (savedLevel) setUserLevel(parseInt(savedLevel));
      if (savedXP) setUserXP(parseInt(savedXP));
      
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
  const getSwaraFrequency = (swaraName, context = {}) => {
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
      
      // Explicit octave variants
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
    
    // If not found, check for explicit octave marking
    if (semitoneOffset === undefined) {
      const cleanSwara = processedSwara.replace(/'/g, '');
      semitoneOffset = noteOffsets[cleanSwara];
      
      // Apply contextual octave logic for ambiguous cases
      if (semitoneOffset !== undefined && context.sequence && context.position !== undefined) {
        semitoneOffset = applyContextualOctave(cleanSwara, semitoneOffset, context);
      }
    }
    
    // Default to 0 if still not found
    if (semitoneOffset === undefined) {
      semitoneOffset = 0;
    }
    
    return saFrequency * Math.pow(2, semitoneOffset / 12);
  };

  // Helper function to apply contextual octave logic
  const applyContextualOctave = (swara, baseOffset, context) => {
    return baseOffset; // No contextual adjustment - rely on notation
  };

  const getPitchDeviation = (currentFreq, targetFreq) => {
    if (!currentFreq || !targetFreq) return null;
    return Math.round(1200 * Math.log2(currentFreq / targetFreq));
  };

  // Calculate pitch stability from recent pitch history
  const calculatePitchStability = (pitches) => {
    if (pitches.length < 5) return 0;
    
    // Get last 10 pitch values for stability calculation
    const recentPitches = pitches.slice(-10);
    const average = recentPitches.reduce((sum, p) => sum + p, 0) / recentPitches.length;
    
    // Calculate variance (how much pitches deviate from average)
    const variance = recentPitches.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / recentPitches.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Convert to stability score (lower deviation = higher stability)
    // 10 cents deviation = 90% stability, 50 cents = 0% stability
    const stabilityScore = Math.max(0, 100 - (standardDeviation * 2));
    
    return Math.round(stabilityScore);
  };

  const updateToleranceLevel = (cents) => {
    if (cents <= 20) return 'Expert';
    if (cents <= 35) return 'Strict';  
    if (cents <= 50) return 'Medium';
    if (cents <= 75) return 'Easy';
    return 'Beginner';
  };

  // Helper function to get the base swara name (without octave indicators)
  const getBaseSwaraName = (swaraName) => {
    if (!swaraName) return '';
    // Remove octave indicators like ', ", ', etc.
    return swaraName.replace(/['"`´]/g, '').trim();
  };

  // Helper function to check if two swaras are the same base note (regardless of octave)
  const isSameSwaraBase = (swara1, swara2) => {
    return getBaseSwaraName(swara1) === getBaseSwaraName(swara2);
  };

  const detectUserSwara = (frequency) => {
    if (!frequency || !saFrequency) {
      setUserCurrentSwara(null);
      return;
    }

    // Check all swaras including octave variants
    const swaras = ['S', 'r', 'R', 'g', 'G', 'M', 'm', 'P', 'd', 'D', 'n', 'N'];
    let closestSwara = null;
    let minDeviation = Infinity;
    let debugInfo = [];

    // Check each swara in current octave and adjacent octaves
    swaras.forEach(swara => {
      // Current octave
      const swaraFreq = getSwaraFrequency(swara);
      const deviation = Math.abs(frequency - swaraFreq);
      
      debugInfo.push({
        swara: swara,
        swaraFreq: Math.round(swaraFreq),
        deviation: Math.round(deviation),
        octave: 'current'
      });
      
      if (deviation < minDeviation) {
        minDeviation = deviation;
        closestSwara = swara;
      }

      // Check higher octave (double frequency)
      const higherOctaveFreq = swaraFreq * 2;
      const higherDeviation = Math.abs(frequency - higherOctaveFreq);
      
      debugInfo.push({
        swara: `${swara}'`,
        swaraFreq: Math.round(higherOctaveFreq),
        deviation: Math.round(higherDeviation),
        octave: 'higher'
      });
      
      if (higherDeviation < minDeviation) {
        minDeviation = higherDeviation;
        closestSwara = swara; // Keep base swara name for consistency
      }

      // Check lower octave (half frequency)
      const lowerOctaveFreq = swaraFreq / 2;
      const lowerDeviation = Math.abs(frequency - lowerOctaveFreq);
      
      debugInfo.push({
        swara: `'${swara}`,
        swaraFreq: Math.round(lowerOctaveFreq),
        deviation: Math.round(lowerDeviation),
        octave: 'lower'
      });
      
      if (lowerDeviation < minDeviation) {
        minDeviation = lowerDeviation;
        closestSwara = swara; // Keep base swara name for consistency
      }
    });

    // Accept if within 150 cents (more generous)
    const finalMatch = minDeviation < 150 ? closestSwara : null;

    // Debug logging - show top 5 closest matches
    if (__DEV__) {
      const sortedDebug = debugInfo.sort((a, b) => a.deviation - b.deviation).slice(0, 5);
      console.log('detectUserSwara Debug:', {
        inputFreq: Math.round(frequency),
        saFreq: Math.round(saFrequency),
        finalMatch,
        minDeviation: Math.round(minDeviation),
        topMatches: sortedDebug
      });
    }

    setUserCurrentSwara(finalMatch);
  };

  const completeSwaraPractice = () => {
    // For single swara practice, we complete the current swara and can start again
    if (practiceMode === 'freeform') {
      // Just reset the hold timer to practice again
      setCurrentHoldTime(0);
      progressValue.setValue(0);
      return;
    }
    
    // For raag practice, advance to next swara or complete sequence
    if (currentSwaraIndex < swaraSequence.length - 1) {
      const nextIndex = currentSwaraIndex + 1;
      setCurrentSwaraIndex(nextIndex);
      setCurrentHoldTime(0);
      progressValue.setValue(0);
    } else {
      // Sequence completed
      completeLevel();
    }
  };



  const getStabilityFeedback = (stability) => {
    if (stability >= 90) return '🎯 Rock Steady!';
    if (stability >= 70) return '🎵 Very Stable';
    if (stability >= 50) return '📈 Getting Steady';
    if (stability >= 30) return '🌊 Wavering';
    return '⚡ Very Shaky';
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
    // Raag sequence completed! Mark as completed and return to setup
    const newCompletedRaags = [...completedRaags, selectedRaag];
    setCompletedRaags(newCompletedRaags);
    saveCompletedRaags(newCompletedRaags);
    
    // Stop the current practice and return to setup
    setGameState('setup');
    if (isRecording) {
      stopRecording();
    }
    stopSwaraTone();
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
    
    // Move to next swara or handle completion
    setTimeout(() => {
      completeSwaraPractice();
    }, 500);
  };

  const completeLevel = () => {
    // Check if we're in raag practice mode
    if (selectedRaag) {
      completeRaagSequence();
      return;
    }
    
    // For single swara practice, just complete and allow restart
    setGameState('completed');
    
    // Award XP
    const xpGain = 50; // Fixed XP gain
    setUserXP(prev => prev + xpGain);
    
    // Check for level up
    if (userXP + xpGain >= userLevel * 100) {
      setUserLevel(prev => prev + 1);
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

  const startGame = async () => {
    if (!saFrequency) {
      Alert.alert('Set Sa First', 'Please detect your Sa frequency before starting the practice.');
      return;
    }
    
    if (!hasPermission) {
      await requestPermissions();
    }
    
    // For freeform mode, set up single swara sequence
    if (practiceMode === 'freeform' && selectedFreeSwara) {
      setSwaraSequence([selectedFreeSwara]);
    }
    
    // Reset game state
    setCurrentSwaraIndex(0);
    setCurrentHoldTime(0);
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
        const targetFrequency = getSwaraFrequency(currentSwara, {
          sequence: swaraSequence,
          position: currentSwaraIndex
        });
        
        // Play tanpura-style tone for 2.0 seconds
        await playSwaraTone(targetFrequency, 2.0);
        
        console.log(`Playing tone for swara: ${currentSwara} at ${Math.round(targetFrequency)}Hz`);
      } catch (error) {
        console.error('Error playing swara tone:', error);
      }
    }
  };

  const adjustHoldTime = (change) => {
    setHoldTime(prev => Math.max(1, Math.min(5, prev + change))); // Between 1-5 seconds
  };

  const adjustSwaraVolume = (change) => {
    const newVolume = Math.max(0, Math.min(1, swaraVolume + change));
    setSwaraVolumeState(newVolume);
    setSwaraVolume(newVolume); // Update the audio engine volume
  };

  const adjustTolerance = (direction) => {
    if (direction === 'easier') {
      setTolerance(prev => Math.min(100, prev + 10));
    } else if (direction === 'harder') {
      setTolerance(prev => Math.max(10, prev - 10));
    }
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
        <Text style={styles.appTitle}>Swara Sadhana</Text>
        <Text style={styles.appSubtitle}>Master Your Voice</Text>
      </View>
      
      <View style={styles.headerRight}>
        {!isPremium && (
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Text style={styles.upgradeButtonText}>✨ Premium</Text>
          </TouchableOpacity>
        )}
        
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
          onPress={() => setShowSettingsModal(true)}
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

  const renderSetupScreen = () => {
    // If no practice mode selected, show mode selection
    if (!practiceMode) {
      return (
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Swara Sadhana</Text>
          <Text style={styles.setupSubtitle}>Master the Art of Indian Classical Music</Text>
          
          <View style={styles.practiceModesContainer}>
            {/* Free-form Practice */}
            <TouchableOpacity
              style={styles.practiceModeCard}
              onPress={() => setPracticeMode('freeform')}
            >
              <Text style={styles.practiceModeIcon}>🎶</Text>
              <Text style={styles.practiceModeTitle}>Swara Practice</Text>
              <Text style={styles.practiceModeDescription}>
                Perfect your intonation with focused practice on individual swaras. 
                Build the foundation of classical singing with real-time feedback.
              </Text>
            </TouchableOpacity>

            {/* Raag-based Practice */}
            <TouchableOpacity
              style={[
                styles.practiceModeCard,
                !isPremium && styles.premiumCard
              ]}
              onPress={() => {
                if (isPremium) {
                  setPracticeMode('raag');
                } else {
                  setShowUpgradeModal(true);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.practiceModeIcon}>🎵</Text>
                {!isPremium && <Text style={styles.premiumBadge}>✨ Premium</Text>}
              </View>
              <Text style={styles.practiceModeTitle}>Raag Mastery</Text>
              <Text style={styles.practiceModeDescription}>
                Journey through the melodic structures of Indian classical raags. 
                Learn arohi, avrohi, and pakad patterns with 100+ authentic raags.
              </Text>
            </TouchableOpacity>

            {/* Raag Sadhana - Gamified Learning */}
            <TouchableOpacity
              style={[
                styles.practiceModeCard,
                !isPremium && styles.premiumCard
              ]}
              onPress={() => {
                if (isPremium) {
                  setPracticeMode('raagSadhana');
                } else {
                  setShowUpgradeModal(true);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.practiceModeIcon}>🏆</Text>
                {!isPremium && <Text style={styles.premiumBadge}>✨ Premium</Text>}
              </View>
              <Text style={styles.practiceModeTitle}>Raag Sadhana</Text>
              <Text style={styles.practiceModeDescription}>
                Gamified raag mastery system. Progress through levels - vadi, samvadi, arohi, avrohi, and pakad. 
                Score points, master each element, and become a raag expert!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // If practice mode is selected, show the relevant setup screen
    return (
      <View style={styles.setupContainer}>
        

          <View style={styles.setupHeader}>
            <TouchableOpacity 
              style={styles.backArrow}
              onPress={() => setPracticeMode(null)}
            >
              <Text style={styles.backArrowText}>←</Text>
            </TouchableOpacity> 
            <Text style={styles.widgetTitle}>
               {practiceMode === 'raag' ? 'Raag Practice' : 
                practiceMode === 'raagSadhana' ? 'Raag Sadhana' : 'Swara Practice'}
              </Text>
          </View>
          
        
        {saFrequency ? (
          <View style={styles.saDisplayContainer}>
            <Text style={styles.saDisplayLabel}>Your Sa Frequency:</Text>
            <Text style={styles.saDisplayValue}>{Math.round(saFrequency)} Hz</Text>
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

        {/* Raag Selector - only for raag mode */}
        {practiceMode === 'raag' && (
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
                    {currentRaagSequence.toUpperCase()}
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
        )}

        {/* Swara Selector - only for freeform mode */}
        {practiceMode === 'freeform' && (
          <View style={styles.swaraSelectorContainer}>
            <Text style={styles.swaraSelectorTitle}>🎵 Select Swara to Practice</Text>
            <View style={styles.swaraGrid}>
              {[
                { name: 'S', label: 'Sa', description: 'Tonic (Do)', free: true },
                { name: 'R', label: 'Shuddha Re', description: 'Major 2nd', free: true },
                { name: 'G', label: 'Shuddha Ga', description: 'Major 3rd', free: true },
                { name: 'M', label: 'Shuddha Ma', description: 'Perfect 4th', free: true },
                { name: 'P', label: 'Pa', description: 'Perfect 5th', free: true },
                { name: 'r', label: 'Komal Re', description: 'Minor 2nd', premium: true },
                { name: 'g', label: 'Komal Ga', description: 'Minor 3rd', premium: true },
                { name: 'm', label: 'Tivra Ma', description: 'Augmented 4th', premium: true },
                { name: 'd', label: 'Komal Dha', description: 'Minor 6th', premium: true },
                { name: 'D', label: 'Shuddha Dha', description: 'Major 6th', premium: true },
                { name: 'n', label: 'Komal Ni', description: 'Minor 7th', premium: true },
                { name: 'N', label: 'Shuddha Ni', description: 'Major 7th', premium: true },
              ].map((swara) => {
                const isLocked = swara.premium && !isPremium;
                return (
                  <TouchableOpacity
                    key={swara.name}
                    style={[
                      styles.swaraButton,
                      selectedFreeSwara === swara.name && styles.selectedSwaraButton,
                      isLocked && styles.lockedSwaraButton
                    ]}
                    onPress={() => {
                      if (isLocked) {
                        setShowUpgradeModal(true);
                      } else {
                        setSelectedFreeSwara(swara.name);
                      }
                    }}
                  >
                    <View style={styles.swaraButtonContent}>
                      <Text style={[
                        styles.swaraButtonText,
                        selectedFreeSwara === swara.name && styles.selectedSwaraButtonText,
                        isLocked && styles.lockedSwaraButtonText
                      ]}>
                        {swara.name}
                      </Text>
                      {isLocked && <Text style={styles.premiumIcon}>✨</Text>}
                    </View>
                    <Text style={[
                      styles.swaraButtonLabel,
                      selectedFreeSwara === swara.name && styles.selectedSwaraButtonLabel,
                      isLocked && styles.lockedSwaraButtonLabel
                    ]}>
                      {swara.label}
                    </Text>
                    <Text style={[
                      styles.swaraButtonDescription,
                      selectedFreeSwara === swara.name && styles.selectedSwaraButtonDescription,
                      isLocked && styles.lockedSwaraButtonDescription
                    ]}>
                      {swara.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedFreeSwara && (
              <TouchableOpacity
                style={styles.clearSwaraButton}
                onPress={() => setSelectedFreeSwara(null)}
              >
                <Text style={styles.clearSwaraText}>❌ Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Start Button */}
        <TouchableOpacity
          style={[
            styles.startSadhanaButton,
            { 
              backgroundColor: '#FF6B35',
              opacity: (saFrequency && (practiceMode === 'freeform' ? selectedFreeSwara : (practiceMode === 'raag' && selectedRaag && !isLoadingRaag))) ? 1 : 0.5 
            }
          ]}
          onPress={startGame}
          disabled={!saFrequency || (practiceMode === 'raag' && (!selectedRaag || isLoadingRaag)) || (practiceMode === 'freeform' && !selectedFreeSwara)}
        >
          <Text style={styles.buttonText}>
            {practiceMode === 'raag' 
              ? '🎼 Start Raag Practice' 
              : selectedFreeSwara 
                ? `🎶 Practice ${selectedFreeSwara}` 
                : '🎶 Select Swara First'
            }
          </Text>
          {practiceMode === 'freeform' && selectedFreeSwara && (
            <Text style={styles.startButtonSubtext}>
              Practice single swara: {selectedFreeSwara}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Invisible spacer to prevent cutoff */}
        <View style={styles.invisibleSpacer} />
      </View>
    );
  };

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
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalTitle}>� Raag Library</Text>
            <Text style={styles.modalSubtitle}>Choose from classical Indian raags</Text>
          </View>
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
        
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search raags by name..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Results Info */}
          <View style={styles.resultsSection}>
            <Text style={styles.resultsText}>
              {filteredRaags.length} of {raagNames.length} raags
            </Text>
            <Text style={styles.completedCount}>
              {completedRaags.length} mastered
            </Text>
          </View>
        </View>
        
        <ScrollView 
          style={styles.raagList} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
        >
          {filteredRaags.map((raagName) => {
            const isCompleted = completedRaags.includes(raagName);
            
            return (
              <TouchableOpacity
                key={raagName}
                style={[
                  styles.simpleRaagItem,
                  isCompleted && styles.completedRaagItem
                ]}
                onPress={() => selectRaag(raagName)}
              >
                <View style={styles.raagItemContent}>
                  <Text style={styles.raagIcon}>
                    {isCompleted ? '✅' : '🎼'}
                  </Text>
                  <Text style={[
                    styles.raagName,
                    isCompleted && styles.completedRaagName
                  ]}>
                    {raagName}
                  </Text>
                  {isCompleted && (
                    <Text style={styles.masteredText}>MASTERED</Text>
                  )}
                </View>
                <Text style={styles.selectArrow}>→</Text>
              </TouchableOpacity>
            );
          })}
          
          {filteredRaags.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsIcon}>🔍</Text>
              <Text style={styles.noResultsText}>No raags found</Text>
              <Text style={styles.noResultsSubtext}>
                Try searching with different keywords or check spelling
              </Text>
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearFiltersText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Upgrade Modal
  const renderUpgradeModal = () => {
    const premiumProduct = products.find(p => p.productId === PREMIUM_PRODUCT_ID);
    const price = premiumProduct ? premiumProduct.localizedPrice : '$4.99';
    
    return (
      <Modal
        visible={showUpgradeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeModal}>
            <Text style={styles.upgradeTitle}>✨ Upgrade to Premium</Text>
            <Text style={styles.upgradeSubtitle}>Unlock all features and content</Text>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎼</Text>
                <Text style={styles.featureText}>Access all 220+ classical raags</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎵</Text>
                <Text style={styles.featureText}>Practice all 12 swaras in free mode</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔄</Text>
                <Text style={styles.featureText}>Unlimited practice sessions</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📱</Text>
                <Text style={styles.featureText}>Ad-free experience</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎯</Text>
                <Text style={styles.featureText}>Advanced pitch tracking</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureText}>Detailed progress analytics</Text>
              </View>
            </View>

            {purchaseError && (
              <Text style={styles.purchaseError}>{purchaseError}</Text>
            )}

            <TouchableOpacity
              style={[styles.upgradeButton, isProcessingPurchase && styles.upgradeButtonDisabled]}
              onPress={upgradeToPremium}
              disabled={isProcessingPurchase}
            >
              {isProcessingPurchase ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.upgradeButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.upgradeButtonText}>Upgrade Now - {price}</Text>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={restorePurchases}
                disabled={isProcessingPurchase}
              >
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelUpgradeButton}
              onPress={() => setShowUpgradeModal(false)}
              disabled={isProcessingPurchase}
            >
              <Text style={styles.cancelUpgradeText}>Maybe Later</Text>
            </TouchableOpacity>
            
            <Text style={styles.legalText}>
              One-time purchase. No subscriptions. Full access forever.
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  // Settings Modal
  const renderSettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>⚙️ Settings</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowSettingsModal(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.settingsContent}>
          {/* Hold Time Setting */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Hold Time</Text>
            <Text style={styles.settingDescription}>
              Duration to hold each swara correctly
            </Text>
            <View style={styles.holdTimeControls}>
              <TouchableOpacity
                style={styles.holdTimeButton}
                onPress={() => adjustHoldTime(-0.5)}
              >
                <Text style={styles.holdTimeButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.holdTimeValue}>{holdTime}s</Text>
              <TouchableOpacity
                style={styles.holdTimeButton}
                onPress={() => adjustHoldTime(0.5)}
              >
                <Text style={styles.holdTimeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pitch Tolerance Setting */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Pitch Tolerance</Text>
            <Text style={styles.settingDescription}>
              How precise your pitch needs to be
            </Text>
            <View style={styles.toleranceControls}>
              <TouchableOpacity
                style={[styles.toleranceButton, tolerance >= 75 && styles.toleranceButtonActive]}
                onPress={() => setTolerance(75)}
              >
                <Text style={[styles.toleranceButtonText, tolerance >= 75 && styles.toleranceButtonTextActive]}>
                  Easy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toleranceButton, tolerance === 50 && styles.toleranceButtonActive]}
                onPress={() => setTolerance(50)}
              >
                <Text style={[styles.toleranceButtonText, tolerance === 50 && styles.toleranceButtonTextActive]}>
                  Medium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toleranceButton, tolerance <= 25 && styles.toleranceButtonActive]}
                onPress={() => setTolerance(25)}
              >
                <Text style={[styles.toleranceButtonText, tolerance <= 25 && styles.toleranceButtonTextActive]}>
                  Hard
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Volume Setting */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Reference Tone Volume</Text>
            <Text style={styles.settingDescription}>
              Volume of the swara reference tones
            </Text>
            <View style={styles.volumeControls}>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => adjustSwaraVolume(-0.1)}
              >
                <Text style={styles.volumeButtonText}>🔉</Text>
              </TouchableOpacity>
              <View style={styles.volumeSlider}>
                <View
                  style={[
                    styles.volumeFill,
                    { width: `${swaraVolume * 100}%` }
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => adjustSwaraVolume(0.1)}
              >
                <Text style={styles.volumeButtonText}>🔊</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.volumeValue}>{Math.round(swaraVolume * 100)}%</Text>
          </View>

          {/* Reset Sa Setting */}
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Sa Frequency</Text>
            <Text style={styles.settingDescription}>
              {saFrequency ? `Current Sa: ${Math.round(saFrequency)} Hz` : 'Sa not set'}
            </Text>
            <TouchableOpacity
              style={styles.resetSaButton}
              onPress={() => {
                setShowSettingsModal(false);
                setGameState('saDetection');
              }}
            >
              <Text style={styles.resetSaButtonText}>🎯 Reset Sa</Text>
            </TouchableOpacity>
          </View>

          {/* Debug Section - Only in Development */}
          {__DEV__ && (
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>🔧 Debug Controls</Text>
              <Text style={styles.settingDescription}>
                Development testing tools
              </Text>
              
              <View style={styles.debugControls}>
                <TouchableOpacity
                  style={[
                    styles.debugButton,
                    { backgroundColor: isPremium ? '#4CAF50' : '#F44336' }
                  ]}
                  onPress={togglePremiumForTesting}
                >
                  <Text style={styles.debugButtonText}>
                    {isPremium ? '⭐ PREMIUM' : '💎 FREE'}
                  </Text>
                  <Text style={styles.debugButtonSubtext}>
                    Tap to toggle
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={resetAllData}
                >
                  <Text style={styles.debugButtonText}>🗑️ RESET</Text>
                  <Text style={styles.debugButtonSubtext}>
                    Clear all data
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.debugInfo}>
                <Text style={styles.debugInfoText}>
                  Premium: {isPremium ? '✅ Active' : '❌ Inactive'}
                </Text>
                <Text style={styles.debugInfoText}>
                  Level: {userLevel} | XP: {userXP}
                </Text>
                <Text style={styles.debugInfoText}>
                  Raags Completed: {completedRaags.length}
                </Text>
                <Text style={styles.debugInfoText}>
                  Sa Frequency: {saFrequency ? `${Math.round(saFrequency)}Hz` : 'Not Set'}
                </Text>
                <Text style={styles.debugInfoText}>
                  Products: {products.length} | Processing: {isProcessingPurchase ? 'Yes' : 'No'}
                </Text>
              </View>
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
       

        {/* Combined Training Analytics Widget */}
        <View style={styles.trainingAnalyticsWidget}>
           <View style={styles.widgetHeader}>
            <TouchableOpacity 
              style={styles.backArrow}
              onPress={resetGame}
            >
              <Text style={styles.backArrowText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.widgetTitle}>Practice Analytics</Text>
          </View>
          <View style={styles.pitchInfo}>
            <Text style={styles.pitchLabel}>Your Pitch:</Text>
            <Text style={styles.pitchValue}>
              {currentPitch?.frequency ? `${Math.round(currentPitch.frequency)} Hz` : '--'}
            </Text>
            <Text style={styles.detectedSwara}>
              {userCurrentSwara ? `Singing: ${userCurrentSwara}` : 'Not detecting'}
            </Text>
          </View>
          <View style={styles.confidenceBar}>
            <Text style={styles.confidenceLabel}>Confidence:</Text>
            <View style={styles.confidenceBarBackground}>
              <View 
                style={[
                  styles.confidenceBarFill,
                  { 
                    width: `${(currentPitch?.confidence || 0) * 100}%`,
                    backgroundColor: (currentPitch?.confidence || 0) > 0.7 ? '#4CAF50' : 
                                   (currentPitch?.confidence || 0) > 0.4 ? '#FF9800' : '#F44336'
                  }
                ]}
              />
            </View>
            <Text style={styles.confidenceValue}>
              {Math.round((currentPitch?.confidence || 0) * 100)}%
            </Text>
          </View>
       
         

           <View style={styles.swaraWheel}>
            {/* Outer ring with all 12 swaras */}
            {['S', 'r', 'R', 'g', 'G', 'M', 'm', 'P', 'd', 'D', 'n', 'N'].map((swara, index) => {
              const angle = (index * 30) - 90; // Start from top, 30° apart
              const radius = 75;
              const x = radius * Math.cos((angle * Math.PI) / 180);
              const y = radius * Math.sin((angle * Math.PI) / 180);
              
              const isTarget = isSameSwaraBase(swara, currentSwara);
              const isUserSinging = isSameSwaraBase(swara, userCurrentSwara);
              const isInSequence = swaraSequence.some(seqSwara => isSameSwaraBase(swara, seqSwara));
              
              return (
                <TouchableOpacity
                  key={swara}
                  style={[
                    styles.swaraPoint,
                    {
                      left: 90 + x - 15, // Center - half width
                      top: 90 + y - 15,  // Center - half height
                      backgroundColor: isTarget ? '#FF6B35' : 
                                     isUserSinging ? '#4CAF50' : 
                                     isInSequence ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isTarget ? '#FF8A50' : 
                                  isUserSinging ? '#66BB6A' : 'rgba(255, 255, 255, 0.2)',
                      borderWidth: isTarget || isUserSinging ? 2 : 1,
                      transform: [{ scale: isTarget || isUserSinging ? 1.2 : 1 }],
                    }
                  ]}
                  onPress={() => {
                    const swaraFreq = getSwaraFrequency(swara, {
                      sequence: swaraSequence,
                      position: swaraSequence.findIndex(s => isSameSwaraBase(s, swara))
                    });
                    playSwaraTone(swaraFreq, 1.5);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.swaraPointText,
                    { 
                      color: (isTarget || isUserSinging) ? '#fff' : 
                             isInSequence ? '#ccc' : '#888',
                      fontWeight: (isTarget || isUserSinging) ? 'bold' : 'normal',
                    }
                  ]}>
                    {swara}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            {/* Center hub */}
            <View style={styles.centerHub}>
              <View style={styles.targetDisplay}>
                <Text style={styles.targetLabel}>TARGET</Text>
                <Animated.Text 
                  style={[
                    styles.targetSwara,
                    { transform: [{ scale: scaleValue }] }
                  ]}
                >
                  {currentSwara}
                </Animated.Text>
                <Text style={styles.targetFreq}>
                  {Math.round(getSwaraFrequency(currentSwara, {
                    sequence: swaraSequence,
                    position: currentSwaraIndex
                  }))} Hz
                </Text>
              </View>
              
              {userCurrentSwara && userCurrentSwara !== currentSwara && (
                <View style={styles.userDisplay}>
                  <Text style={styles.userLabel}>YOU</Text>
                  <Text style={styles.userSwara}>{userCurrentSwara}</Text>
                  <Text style={styles.userFreq}>
                    {currentPitch?.frequency ? Math.round(currentPitch.frequency) : 0} Hz
                  </Text>
                </View>
              )}
              
              {userCurrentSwara === currentSwara && (
                <View style={styles.matchDisplay}>
                  <Text style={styles.matchText}>✓ MATCH</Text>
                  <Text style={styles.matchFreq}>
                    {currentPitch?.frequency ? Math.round(currentPitch.frequency) : 0} Hz
                  </Text>
                </View>
              )}
            </View>
          </View>
          
         
          
          {/* Three metric cards in a row */}
          <View style={styles.metricsRow}>
            {/* Hold Progress Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Hold Progress</Text>
              <View style={styles.circularProgress}>
                <View style={styles.progressRing}>
                  <Animated.View
                    style={[
                      styles.progressRingFill,
                      {
                        transform: [{
                          rotate: progressValue.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0deg', '360deg'],
                          })
                        }],
                        borderColor: isHoldingCorrectly ? '#4CAF50' : '#FF6B35',
                      }
                    ]}
                  />
                </View>
                <View style={styles.progressCenter}>
                  <Text style={styles.progressPercentage}>
                    {Math.round((currentHoldTime / holdTime) * 100)}%
                  </Text>
                  <Text style={styles.progressTime}>
                    {Math.max(0, holdTime - currentHoldTime).toFixed(1)}s
                  </Text>
                </View>
              </View>
            </View>

            {/* Pitch Accuracy Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pitch Accuracy</Text>
              <View style={styles.linearProgressContainer}>
                <View
                  style={[
                    styles.linearProgressFill,
                    {
                      width: `${pitchAccuracy}%`,
                      backgroundColor: pitchAccuracy > 80 ? '#4CAF50' : 
                                     pitchAccuracy > 60 ? '#8BC34A' :
                                     pitchAccuracy > 40 ? '#FFC107' : '#F44336',
                    }
                  ]}
                />
              </View>
              <Text style={styles.metricValue}>{Math.round(pitchAccuracy)}%</Text>
              <Text style={styles.metricSubtext}>
                {currentPitch?.frequency && saFrequency ? 
                  `${getPitchDeviation(currentPitch.frequency, getSwaraFrequency(currentSwara, {
                    sequence: swaraSequence,
                    position: currentSwaraIndex
                  })) > 0 ? '+' : ''}${Math.round(getPitchDeviation(currentPitch.frequency, getSwaraFrequency(currentSwara, {
                    sequence: swaraSequence,
                    position: currentSwaraIndex
                  })) || 0)} cents` 
                  : '-- cents'
                }
              </Text>
            </View>

            {/* Pitch Stability Card */}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Voice Stability</Text>
              <View style={styles.linearProgressContainer}>
                <View
                  style={[
                    styles.linearProgressFill,
                    {
                      width: `${pitchStability}%`,
                      backgroundColor: pitchStability > 80 ? '#2E7D32' : 
                                     pitchStability > 60 ? '#66BB6A' :
                                     pitchStability > 40 ? '#FFC107' : '#F44336',
                    }
                  ]}
                />
              </View>
              <Text style={styles.metricValue}>{pitchStability}%</Text>
              <Text style={styles.metricSubtext}>{stabilityFeedback}</Text>
            </View>
          </View>
           {/* Progress and controls - only show sequence progress in raag mode */}
          {selectedRaag && (
            <View style={styles.wheelControls}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {currentSwaraIndex + 1} of {swaraSequence.length}
                </Text>
                <Text style={styles.raagText}>
                  {selectedRaag} • {currentRaagSequence.toUpperCase()}
                </Text>
              </View>
            </View>
          )}

      

          {/* Sequence Progress Display - Shows notes to be played */}
          <View style={styles.sequenceDisplay}>
            <Text style={styles.sequenceLabel}>Sequence Progress</Text>
            <View style={styles.sequenceNotesContainer}>
              {swaraSequence.map((swara, index) => (
                <View
                  key={index}
                  style={[
                    styles.sequenceNoteItem,
                    {
                      backgroundColor: index < currentSwaraIndex ? '#4CAF50' : 
                                     index === currentSwaraIndex ? '#FF6B35' : '#FF9800'
                    }
                  ]}
                >
                  <Text style={[
                    styles.sequenceNoteText,
                    {
                      color: index <= currentSwaraIndex ? '#fff' : '#fff',
                      fontWeight: index === currentSwaraIndex ? 'bold' : '600'
                    }
                  ]}>
                    {swara}
                  </Text>
                  {index < currentSwaraIndex && (
                    <Text style={styles.completedIndicator}>✓</Text>
                  )}
                  {index === currentSwaraIndex && (
                    <Text style={styles.currentIndicator}>●</Text>
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.sequenceProgress}>
              {currentSwaraIndex} of {swaraSequence.length} completed
            </Text>
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.feedbackSection}>
         
        </View>
      </View>
    );
  };

  const renderPausedScreen = () => (
    <View style={styles.pausedContainer}>
      <Text style={styles.pausedTitle}>⏸️ Practice Paused</Text>
      <Text style={styles.pausedScore}>Take a break and resume when ready</Text>
      
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
      <Text style={styles.completedTitle}>🎉 Practice Complete!</Text>
      <Text style={styles.finalScore}>Well done! Keep practicing to improve your accuracy.</Text>
      
      <View style={styles.completedControls}>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={() => startGame()} // Continue practice
        >
          <Text style={styles.buttonText}>🚀 Practice Again</Text>
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
    // Handle raagSadhana navigation
    if (practiceMode === 'raagSadhana') {
      return (
        <RaagSadhana 
          onBack={() => setPracticeMode(null)}
          saFrequency={saFrequency}
          onSetSa={() => setGameState('saDetection')}
        />
      );
    }

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
      {renderUpgradeModal()}
      {renderSettingsModal()}
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

  // Header Controls
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerToggleActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  headerToggleText: {
    fontSize: 11,
    color: '#ccc',
    fontWeight: '600',
  },
  headerToggleTextActive: {
    color: '#fff',
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  
  // Pitch Stability Section
  stabilitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stabilityBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stabilityBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  stabilityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stabilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stabilityFeedbackText: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  
  // Tolerance Adjustment Section
  toleranceSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toleranceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toleranceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  toleranceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  toleranceInfo: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  toleranceLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  toleranceValue: {
    fontSize: 14,
    color: '#aaa',
  },
  toleranceDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  // Loop Mode Section
  loopSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  toggleButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#aaa',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  loopControls: {
    marginTop: 12,
  },
  loopTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  loopTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    alignItems: 'center',
  },
  loopTypeButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: '#FF6B35',
  },
  loopTypeText: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '600',
  },
  loopTypeTextActive: {
    color: '#FF6B35',
  },
  loopInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loopCountText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  maxLoopControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loopAdjustButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loopAdjustButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  maxLoopText: {
    fontSize: 14,
    color: '#fff',
    marginHorizontal: 12,
    fontWeight: '600',
  },
  
  // Breath Guide Section
  breathSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  breathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breathInfo: {
    marginTop: 12,
  },
  breathDescription: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 12,
  },
  breathMomentIndicator: {
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#87CEEB',
    alignItems: 'center',
  },
  breathMomentText: {
    fontSize: 16,
    color: '#87CEEB',
    fontWeight: 'bold',
  },
  breathCount: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  sequenceItemContainer: {
    alignItems: 'center',
  },
  breathMarker: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: 'rgba(135, 206, 250, 0.8)',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathMarkerText: {
    fontSize: 8,
    lineHeight: 12,
  },
  
  // Combined Training Analytics Widget
  trainingAnalyticsWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backArrow: {
    padding: 8,
    marginRight: 8,
  },
  backArrowText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
    textAlign: 'center',
  },
  circularProgress: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressRing: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingFill: {
    position: 'absolute',
    width: 51,
    height: 51,
    borderRadius: 25.5,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 45,
    height: 45,
    top: 5,
    left: 5,
  },
  progressPercentage: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 9,
    marginBottom: -1,
  },
  progressTime: {
    fontSize: 6,
    color: '#aaa',
    lineHeight: 7,
    marginTop: -1,
  },
  linearProgressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  linearProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  metricFeedback: {
    fontSize: 9,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Sequence Display Styles
  sequenceDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  sequenceLabel: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  sequenceNotesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sequenceNoteItem: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sequenceNoteText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 2,
  },
  completedIndicator: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  currentIndicator: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  sequenceProgress: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Professional Swara Dial
  swaraDialContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  swaraCircle: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  swaraNode: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  swaraNodeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dialCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 40,
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dialCenterLabel: {
    fontSize: 10,
    color: '#aaa',
    marginBottom: 2,
  },
  dialCenterSwara: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  dialUserLabel: {
    fontSize: 8,
    color: '#4CAF50',
    marginTop: 4,
  },
  dialUserSwara: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  dialProgressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  dialProgressText: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  playReferenceButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playReferenceText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  raagInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  raagInfoText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  
  // Simple user swara display
  userSwaraLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  // Professional Swara Circle
  swaraCircleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  circleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  swaraWheel: {
    width: 180,
    height: 180,
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
    alignSelf: 'center',
  },
  swaraPoint: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  swaraPointText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerHub: {
    position: 'absolute',
    left: 40,
    top: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  targetDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: {
    fontSize: 8,
    color: '#FF6B35',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 1,
  },
  targetSwara: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 0,
    marginBottom: 1,
    lineHeight: 22,
  },
  targetFreq: {
    fontSize: 7,
    color: '#FF8C69',
    fontWeight: '500',
    opacity: 0.8,
    marginTop: 0,
  },
  userDisplay: {
    alignItems: 'center',
    marginTop: 4,
  },
  userLabel: {
    fontSize: 7,
    color: '#4CAF50',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  userSwara: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    lineHeight: 16,
    marginBottom: 1,
  },
  userFreq: {
    fontSize: 6,
    color: '#81C784',
    fontWeight: '500',
    opacity: 0.8,
  },
  matchDisplay: {
    alignItems: 'center',
    marginTop: 4,
  },
  matchText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 12,
    marginBottom: 1,
  },
  matchFreq: {
    fontSize: 6,
    color: '#81C784',
    fontWeight: '500',
    opacity: 0.8,
    marginTop: 0,
  },
  wheelControls: {
    width: '100%',
    alignItems: 'center',
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  raagText: {
    fontSize: 12,
    color: '#aaa',
  },
  playButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  playButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
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
    fontSize: 42,
    fontWeight: '800',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 0,
    letterSpacing: 1,
  },
  setupSubtitle: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  backButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  practiceModesContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  // Professional App Header Styles
  appHeaderSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appMainTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  appTagline: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  appDescriptionCard: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  appDescription: {
    fontSize: 14,
    color: '#C0C0C0',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },

  // Practice Mode Section Styles
  practiceModesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Professional Practice Mode Cards
  practiceModeProfessionalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 0,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  premiumModeCard: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  lockedModeCard: {
    opacity: 0.8,
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    marginRight: 16,
    position: 'relative',
  },
  cardIcon: {
    fontSize: 32,
  },
  premiumBadgeOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeText: {
    fontSize: 12,
    color: '#000',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  premiumLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#C0C0C0',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFeatures: {
    marginTop: 8,
  },
  featureBullet: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 2,
    lineHeight: 16,
  },
  cardArrow: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  disabledArrow: {
    color: '#666',
  },

  // User Progress Section
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  practiceModeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  practiceModeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  practiceModeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 12,
    textAlign: 'center',
  },
  practiceModeDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
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

  // Live Pitch Display
  livePitchDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pitchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pitchLabel: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  pitchValue: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  detectedSwara: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '600',
    width: 70,
  },
  confidenceBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.2s ease',
  },
  confidenceValue: {
    fontSize: 12,
    color: '#ccc',
    fontFamily: 'monospace',
    width: 35,
    textAlign: 'right',
  },
  debugPitchInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#aaa',
    fontFamily: 'monospace',
    lineHeight: 12,
  },
  
  // Simple Header
  simpleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  simpleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  
  // Swara Selector Styles
  swaraSelectorContainer: {
    marginVertical: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  swaraSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 15,
  },
  swaraGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  swaraButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    width: '30%',
    alignItems: 'center',
    minHeight: 80,
  },
  selectedSwaraButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  swaraButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  selectedSwaraButtonText: {
    color: '#66BB6A',
  },
  swaraButtonLabel: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedSwaraButtonLabel: {
    color: '#81C784',
  },
  swaraButtonDescription: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  selectedSwaraButtonDescription: {
    color: '#A5D6A7',
  },
  clearSwaraButton: {
    marginTop: 15,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  clearSwaraText: {
    color: '#F44336',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  startButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    textAlign: 'center',
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '400',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
  },
  // Enhanced Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchIcon: {
    fontSize: 18,
    color: '#888',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 14,
    fontWeight: '400',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearSearchText: {
    color: '#888',
    fontSize: 16,
  },
  resultsSection: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
  },
  completedCount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  raagList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  // Simple Raag Items
  simpleRaagItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  raagItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  raagIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  raagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  completedRaagName: {
    color: '#4CAF50',
  },
  masteredText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '700',
    marginLeft: 8,
  },
  selectArrow: {
    fontSize: 16,
    color: '#888',
    marginLeft: 12,
  },
  completedRaagItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  
  // Enhanced No Results and Footer
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  clearFiltersButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  footerTip: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  
  // Premium and Upgrade Styles
  upgradeButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  premiumCard: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumBadge: {
    backgroundColor: '#FF6B35',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  upgradeModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  cancelUpgradeButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  cancelUpgradeText: {
    color: '#aaa',
    fontSize: 16,
  },
  
  // Settings Modal Styles
  settingsContent: {
    padding: 20,
  },
  settingItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
  },
  holdTimeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdTimeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  holdTimeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  holdTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    minWidth: 40,
    textAlign: 'center',
  },
  toleranceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toleranceButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  toleranceButtonActive: {
    backgroundColor: '#FF6B35',
  },
  toleranceButtonText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  toleranceButtonTextActive: {
    color: '#fff',
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  volumeButtonText: {
    fontSize: 20,
  },
  volumeSlider: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginHorizontal: 12,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  volumeValue: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 8,
  },
  resetSaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetSaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Locked Swara Styles
  lockedSwaraButton: {
    opacity: 0.6,
    borderColor: '#FF6B35',
  },
  lockedSwaraButtonText: {
    color: '#aaa',
  },
  lockedSwaraButtonLabel: {
    color: '#aaa',
  },
  lockedSwaraButtonDescription: {
    color: '#aaa',
  },
  swaraButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  premiumIcon: {
    fontSize: 12,
    color: '#FF6B35',
  },
  
  // Debug Styles (Development Only)
  debugControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  debugButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  debugButtonSubtext: {
    color: '#aaa',
    fontSize: 10,
  },
  debugInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugInfoText: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  
  // Enhanced upgrade modal styles
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseError: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  restoreButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
  },
  restoreButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  legalText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  
  // Utility styles
  invisibleSpacer: {
    height: 50,
    opacity: 0,
  },
});

export default RiyaazScreen;
