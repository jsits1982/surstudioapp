import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import Slider from '@react-native-community/slider';

function MixerScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [volume, setVolume] = useState(70);
  const [bass, setBass] = useState(50);
  const [treble, setTreble] = useState(50);
  const [reverb, setReverb] = useState(30);
  const [delay, setDelay] = useState(20);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const presets = [
    { name: 'Vocal', settings: { bass: 40, treble: 60, reverb: 45, delay: 15 } },
    { name: 'Classical', settings: { bass: 55, treble: 45, reverb: 60, delay: 25 } },
    { name: 'Studio', settings: { bass: 50, treble: 50, reverb: 20, delay: 10 } },
    { name: 'Live', settings: { bass: 60, treble: 55, reverb: 70, delay: 30 } }
  ];

  const tracks = [
    { name: 'Vocal', volume: 75, muted: false, solo: false },
    { name: 'Tabla', volume: 65, muted: false, solo: false },
    { name: 'Harmonium', volume: 55, muted: false, solo: false },
    { name: 'Tanpura', volume: 45, muted: false, solo: false }
  ];

  const [trackStates, setTrackStates] = useState(tracks);

  const applyPreset = (preset) => {
    setBass(preset.settings.bass);
    setTreble(preset.settings.treble);
    setReverb(preset.settings.reverb);
    setDelay(preset.settings.delay);
  };

  const toggleTrackMute = (index) => {
    const newTrackStates = [...trackStates];
    newTrackStates[index].muted = !newTrackStates[index].muted;
    setTrackStates(newTrackStates);
  };

  const toggleTrackSolo = (index) => {
    const newTrackStates = [...trackStates];
    newTrackStates[index].solo = !newTrackStates[index].solo;
    setTrackStates(newTrackStates);
  };

  const updateTrackVolume = (index, newVolume) => {
    const newTrackStates = [...trackStates];
    newTrackStates[index].volume = newVolume;
    setTrackStates(newTrackStates);
  };

  return (
    <View style={[styles.container, backgroundStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.titleText, textStyle]}>Audio Mixer</Text>
        <Text style={[styles.subtitleText, textStyle]}>Mix and master your recordings</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Transport Controls */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Transport</Text>
          <View style={styles.transportControls}>
            <TouchableOpacity
              style={[styles.transportButton, isRecording && styles.recordingButton]}
              onPress={() => setIsRecording(!isRecording)}
            >
              <Text style={styles.transportButtonText}>
                {isRecording ? '⏹️ Stop' : '⏺️ Rec'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.transportButton, isPlaying && styles.playingButton]}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.transportButtonText}>
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.transportButton}>
              <Text style={styles.transportButtonText}>⏹️ Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.transportButton}>
              <Text style={styles.transportButtonText}>⏪ Rewind</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Master Volume */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Master Volume: {volume}%</Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderLabel, textStyle]}>0</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={volume}
              onValueChange={setVolume}
              minimumTrackTintColor="#2196F3"
              maximumTrackTintColor="#ccc"
              thumbTintColor="#2196F3"
            />
            <Text style={[styles.sliderLabel, textStyle]}>100</Text>
          </View>
        </View>

        {/* EQ Controls */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Equalizer</Text>
          
          <View style={styles.eqControl}>
            <Text style={[styles.eqLabel, textStyle]}>Bass: {bass}%</Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, textStyle]}>0</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={bass}
                onValueChange={setBass}
                minimumTrackTintColor="#4CAF50"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#4CAF50"
              />
              <Text style={[styles.sliderLabel, textStyle]}>100</Text>
            </View>
          </View>

          <View style={styles.eqControl}>
            <Text style={[styles.eqLabel, textStyle]}>Treble: {treble}%</Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, textStyle]}>0</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={treble}
                onValueChange={setTreble}
                minimumTrackTintColor="#FF9800"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#FF9800"
              />
              <Text style={[styles.sliderLabel, textStyle]}>100</Text>
            </View>
          </View>
        </View>

        {/* Effects */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Effects</Text>
          
          <View style={styles.effectControl}>
            <Text style={[styles.effectLabel, textStyle]}>Reverb: {reverb}%</Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, textStyle]}>0</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={reverb}
                onValueChange={setReverb}
                minimumTrackTintColor="#9C27B0"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#9C27B0"
              />
              <Text style={[styles.sliderLabel, textStyle]}>100</Text>
            </View>
          </View>

          <View style={styles.effectControl}>
            <Text style={[styles.effectLabel, textStyle]}>Delay: {delay}%</Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, textStyle]}>0</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={delay}
                onValueChange={setDelay}
                minimumTrackTintColor="#F44336"
                maximumTrackTintColor="#ccc"
                thumbTintColor="#F44336"
              />
              <Text style={[styles.sliderLabel, textStyle]}>100</Text>
            </View>
          </View>
        </View>

        {/* Presets */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Presets</Text>
          <View style={styles.presetButtons}>
            {presets.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={styles.presetButton}
                onPress={() => applyPreset(preset)}
              >
                <Text style={styles.presetButtonText}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Track Mixer */}
        <View style={[styles.section, cardStyle]}>
          <Text style={[styles.sectionTitle, textStyle]}>Track Mixer</Text>
          {trackStates.map((track, index) => (
            <View key={index} style={styles.trackRow}>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackName, textStyle]}>{track.name}</Text>
                <Text style={[styles.trackVolume, textStyle]}>{Math.round(track.volume)}%</Text>
              </View>
              <View style={styles.trackControls}>
                <TouchableOpacity
                  style={[styles.trackButton, track.muted && styles.mutedButton]}
                  onPress={() => toggleTrackMute(index)}
                >
                  <Text style={styles.trackButtonText}>M</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.trackButton, track.solo && styles.soloButton]}
                  onPress={() => toggleTrackSolo(index)}
                >
                  <Text style={styles.trackButtonText}>S</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.trackSliderContainer}>
                <Slider
                  style={styles.trackSlider}
                  minimumValue={0}
                  maximumValue={100}
                  value={track.volume}
                  onValueChange={(value) => updateTrackVolume(index, value)}
                  minimumTrackTintColor="#2196F3"
                  maximumTrackTintColor="#ccc"
                  thumbTintColor="#2196F3"
                />
              </View>
            </View>
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
  transportControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  transportButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#666',
    borderRadius: 25,
    margin: 5,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  playingButton: {
    backgroundColor: '#4CAF50',
  },
  transportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 12,
    minWidth: 25,
    textAlign: 'center',
  },
  eqControl: {
    marginBottom: 15,
  },
  eqLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  effectControl: {
    marginBottom: 15,
  },
  effectLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetButton: {
    width: '22%',
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  presetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  trackInfo: {
    width: 80,
    marginRight: 10,
  },
  trackName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trackVolume: {
    fontSize: 12,
    opacity: 0.7,
  },
  trackControls: {
    flexDirection: 'row',
    marginRight: 10,
  },
  trackButton: {
    width: 30,
    height: 30,
    backgroundColor: '#666',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  mutedButton: {
    backgroundColor: '#F44336',
  },
  soloButton: {
    backgroundColor: '#FF9800',
  },
  trackButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trackSliderContainer: {
    flex: 1,
  },
  trackSlider: {
    flex: 1,
    height: 40,
  },
});

export default MixerScreen;
