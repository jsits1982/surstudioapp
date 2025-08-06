import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PitchVisualizer = ({ pitch, isDarkMode }) => {
  if (!pitch) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noPitchText, { color: isDarkMode ? '#888' : '#666' }]}>
          No pitch detected
        </Text>
      </View>
    );
  }

  const { frequency, confidence } = pitch;
  
  const getConfidenceColor = () => {
    if (confidence > 0.9) return '#4CAF50'; // Green - Very confident
    if (confidence > 0.75) return '#8BC34A'; // Light green - Good
    if (confidence > 0.6) return '#FFEB3B'; // Yellow - Fair
    if (confidence > 0.4) return '#FF9800'; // Orange - Poor
    return '#F44336'; // Red - Very poor
  };

  return (
    <View style={styles.container}>
      {/* Frequency Display */}
      <View style={styles.noteContainer}>
        <Text style={[styles.noteText, { color: getConfidenceColor() }]}>
          {frequency.toFixed(1)} Hz
        </Text>
        <Text style={[styles.accuracyText, { color: getConfidenceColor() }]}>
          {(confidence * 100).toFixed(1)}% confidence
        </Text>
      </View>

      {/* Frequency Visualization */}
      <View style={styles.frequencyContainer}>
        <Text style={[styles.frequencyLabel, { color: isDarkMode ? '#fff' : '#333' }]}>
          Frequency Range
        </Text>
        
        {/* Frequency Bar */}
        <View style={styles.frequencyBar}>
          <View style={[styles.frequencyIndicator, { 
            backgroundColor: getConfidenceColor(),
            left: `${Math.min(Math.max((frequency - 80) / 1000 * 100, 0), 100)}%` 
          }]} />
        </View>
        
        <View style={styles.frequencyLabels}>
          <Text style={[styles.frequencyLabelText, { color: isDarkMode ? '#ccc' : '#666' }]}>
            80 Hz
          </Text>
          <Text style={[styles.frequencyLabelText, { color: isDarkMode ? '#ccc' : '#666' }]}>
            1080 Hz
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 150,
    justifyContent: 'center',
  },
  noPitchText: {
    fontSize: 18,
    fontStyle: 'italic',
  },
  noteContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  noteText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  frequencyContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  frequencyBar: {
    width: 200,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    position: 'relative',
    marginBottom: 10,
  },
  frequencyIndicator: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
  },
  frequencyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
  },
  frequencyLabelText: {
    fontSize: 12,
  },
});

export default PitchVisualizer;
