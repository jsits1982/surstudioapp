import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, TextInput } from 'react-native';

function ComposerScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [selectedScale, setSelectedScale] = useState('Sa Re Ga Ma Pa Dha Ni');
  const [tempo, setTempo] = useState(120);
  const [composition, setComposition] = useState('');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
  };

  const textStyle = {
    color: isDarkMode ? '#ffffff' : '#333333',
  };

  const cardStyle = {
    backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
    borderColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
  };

  const scales = [
    'Sa Re Ga Ma Pa Dha Ni',
    'Sa Re Ga Pa Dha',
    'Sa Ga Ma Dha Ni',
    'Sa Re Ma Pa Ni',
    'Sa Ga Pa Dha'
  ];

  const notes = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];

  const presetCompositions = [
    {
      name: 'Alap in Raag Yaman',
      notes: 'Sa... Ni Re Ga... Ma# Pa... Dha Ni Sa',
      description: 'Traditional alap structure'
    },
    {
      name: 'Bhajan Template',
      notes: 'Sa Pa Ma Ga Re Sa... Re Ga Ma Pa Ga Re Sa',
      description: 'Simple devotional melody'
    },
    {
      name: 'Thumri Pattern',
      notes: 'Ga Re Sa Ni... Sa Re Ga Ma... Pa Ga Re Sa',
      description: 'Classical thumri phrase'
    }
  ];

  return (
    <View style={[styles.container, backgroundStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.titleText, textStyle]}>Music Composer</Text>
        <Text style={[styles.subtitleText, textStyle]}>Create your compositions</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Scale Selector */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Select Scale</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {scales.map((scale, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.scaleButton,
                  selectedScale === scale && styles.selectedScale
                ]}
                onPress={() => setSelectedScale(scale)}
              >
                <Text style={[
                  styles.scaleText,
                  selectedScale === scale && styles.selectedScaleText
                ]}>
                  {scale}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Note Pad */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Note Pad</Text>
          <View style={styles.noteGrid}>
            {notes.map((note, index) => (
              <TouchableOpacity
                key={index}
                style={styles.noteButton}
                onPress={() => setComposition(prev => prev + note + ' ')}
              >
                <Text style={styles.noteButtonText}>{note}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tempo Control */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Tempo: {tempo} BPM</Text>
          <View style={styles.tempoControls}>
            <TouchableOpacity
              style={styles.tempoButton}
              onPress={() => setTempo(Math.max(60, tempo - 10))}
            >
              <Text style={styles.tempoButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.tempoDisplay}>
              <Text style={[styles.tempoText, textStyle]}>{tempo}</Text>
            </View>
            <TouchableOpacity
              style={styles.tempoButton}
              onPress={() => setTempo(Math.min(200, tempo + 10))}
            >
              <Text style={styles.tempoButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Composition Area */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Your Composition</Text>
          <TextInput
            style={[styles.compositionInput, { 
              color: textStyle.color,
              borderColor: isDarkMode ? '#3a3a3a' : '#e0e0e0'
            }]}
            multiline
            numberOfLines={6}
            placeholder="Tap notes above or type your composition..."
            placeholderTextColor={isDarkMode ? '#888' : '#666'}
            value={composition}
            onChangeText={setComposition}
          />
          <View style={styles.compositionControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setComposition('')}
            >
              <Text style={styles.controlButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.playButton]}>
              <Text style={styles.playButtonText}>▶️ Play</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preset Compositions */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Preset Templates</Text>
          {presetCompositions.map((preset, index) => (
            <TouchableOpacity
              key={index}
              style={styles.presetItem}
              onPress={() => setComposition(preset.notes)}
            >
              <Text style={[styles.presetName, textStyle]}>{preset.name}</Text>
              <Text style={[styles.presetDescription, { color: isDarkMode ? '#aaa' : '#666' }]}>
                {preset.description}
              </Text>
              <Text style={[styles.presetNotes, { color: isDarkMode ? '#888' : '#777' }]}>
                {preset.notes}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingTop: 50,
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scaleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  selectedScale: {
    backgroundColor: '#2196F3',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  selectedScaleText: {
    color: 'white',
  },
  noteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noteButton: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tempoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempoButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempoButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tempoDisplay: {
    marginHorizontal: 30,
  },
  tempoText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  compositionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  compositionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#666',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  playButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  presetItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  presetName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  presetNotes: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default ComposerScreen;
