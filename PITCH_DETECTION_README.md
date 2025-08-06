# SurStudio - Real-time Pitch Detection App

SurStudio is a React Native application that provides real-time pitch detection and visualization. The app can analyze audio input from your device's microphone and display the detected pitch, musical note, accuracy, and tuning information.

## 🎵 Features

- **Real-time Pitch Detection**: Analyzes audio input and detects pitch in real-time
- **Multiple Algorithms**: Uses YIN, AMDF, and Macleod algorithms for accurate pitch detection
- **Musical Note Recognition**: Converts frequencies to musical notes (C, D, E, F, G, A, B) with octave information
- **Tuning Visualization**: Shows how many cents sharp or flat the detected pitch is
- **Accuracy Indicator**: Displays detection accuracy with color-coded feedback
- **Audio Level Monitoring**: Shows real-time audio input levels
- **Dark/Light Mode Support**: Automatically adapts to system theme

## 🛠 Technologies Used

- **React Native 0.80.2**: Mobile app framework
- **TypeScript**: Type-safe JavaScript
- **react-native-audio-recorder-player**: Audio recording capabilities
- **react-native-permissions**: Handle microphone permissions
- **pitchfinder**: JavaScript pitch detection algorithms

## 📱 Components

### PitchDetector
Core utility class that implements multiple pitch detection algorithms:
- **YIN Algorithm**: Fundamental frequency estimation
- **AMDF Algorithm**: Average Magnitude Difference Function
- **Macleod Algorithm**: Enhanced autocorrelation-based detection

### useAudioRecorder Hook
Custom React hook that manages:
- Audio recording state
- Microphone permissions
- Real-time pitch analysis
- Error handling

### PitchVisualizer Component
Visual component that displays:
- Current musical note and octave
- Accuracy percentage with color coding
- Cents deviation from perfect pitch
- Frequency in Hz

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 18)
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd /home/satbirsingh/src/SurStudio/SurStudioApp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install iOS dependencies (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the App

1. **Start Metro bundler:**
   ```bash
   npm start
   ```

2. **Run on Android:**
   ```bash
   npm run android
   ```

3. **Run on iOS (macOS only):**
   ```bash
   npm run ios
   ```

## 🔐 Permissions

The app requires microphone permissions to function:

### Android
- `RECORD_AUDIO`: To capture audio for pitch detection
- `WRITE_EXTERNAL_STORAGE` & `READ_EXTERNAL_STORAGE`: For audio file operations

### iOS
- `NSMicrophoneUsageDescription`: Required for microphone access

## 🎯 How to Use

1. **Grant Permissions**: Allow microphone access when prompted
2. **Start Recording**: Tap the "🎤 Start Recording" button
3. **Make Sound**: Sing, hum, or play an instrument
4. **View Results**: See real-time pitch detection with:
   - Musical note (e.g., A4, C#5)
   - Frequency in Hz
   - Accuracy percentage
   - Cents deviation (tuning)

## 🎨 Color Coding

- **Green (90%+ accuracy)**: Very accurate pitch detection
- **Light Green (75-90%)**: Good accuracy
- **Yellow (60-75%)**: Fair accuracy
- **Orange (40-60%)**: Poor accuracy
- **Red (<40%)**: Very poor accuracy

## 🔧 Technical Details

### Pitch Detection Process
1. Audio is captured from microphone
2. Audio buffer is processed by multiple algorithms
3. Best result is selected based on accuracy
4. Frequency is converted to musical note
5. Cents deviation is calculated for tuning reference

### Supported Frequency Range
- Covers musical notes from C0 (16.35 Hz) to C8 (4186 Hz)
- Optimized for human vocal range and common instruments

## 🐛 Troubleshooting

### Common Issues

1. **No pitch detected**:
   - Ensure microphone permissions are granted
   - Check if audio input is loud enough
   - Try different notes or instruments

2. **Inaccurate results**:
   - Ensure clean audio input (minimize background noise)
   - Hold notes steady for better detection
   - Try different algorithms if available

3. **Permission errors**:
   - Go to device settings and manually enable microphone permissions
   - Restart the app after granting permissions

## 📈 Future Enhancements

- Real-time audio buffer processing for more accurate detection
- Chromatic tuner mode
- Custom reference pitch (A4 = 440Hz is default)
- Audio file import and analysis
- Pitch history and recording
- Advanced visualization (waveform, spectrum)

## 🤝 Contributing

This project is open for contributions. Areas for improvement:
- Enhanced pitch detection algorithms
- Better real-time audio processing
- UI/UX improvements
- Performance optimizations

## 📄 License

This project is created for educational and demonstration purposes.

---

**Note**: This is a demonstration app showing pitch detection capabilities. For production use, consider implementing native audio processing modules for better real-time performance.
