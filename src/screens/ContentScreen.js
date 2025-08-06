import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';

function ContentScreen() {
  const isDarkMode = useColorScheme() === 'dark';

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

  const contentItems = [
    {
      id: 1,
      title: 'Raag Basics',
      description: 'Learn the fundamentals of Indian classical raags',
      category: 'Theory',
      duration: '15 min'
    },
    {
      id: 2,
      title: 'Vocal Exercises',
      description: 'Daily vocal warm-ups and techniques',
      category: 'Practice',
      duration: '20 min'
    },
    {
      id: 3,
      title: 'Taal Patterns',
      description: 'Master different rhythmic cycles',
      category: 'Rhythm',
      duration: '12 min'
    },
    {
      id: 4,
      title: 'Sa Re Ga Ma',
      description: 'Perfect your sargam with guided practice',
      category: 'Sargam',
      duration: '18 min'
    },
    {
      id: 5,
      title: 'Classical Compositions',
      description: 'Learn traditional bandish and bhajans',
      category: 'Compositions',
      duration: '25 min'
    },
    {
      id: 6,
      title: 'Improvisation Techniques',
      description: 'Develop your alap and taan skills',
      category: 'Advanced',
      duration: '30 min'
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      Theory: '#2196F3',
      Practice: '#4CAF50',
      Rhythm: '#FF9800',
      Sargam: '#9C27B0',
      Compositions: '#F44336',
      Advanced: '#607D8B'
    };
    return colors[category] || '#666666';
  };

  return (
    <View style={[styles.container, backgroundStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.titleText, textStyle]}>Learning Content</Text>
        <Text style={[styles.subtitleText, textStyle]}>Structured music education</Text>
      </View>

      {/* Content List */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {contentItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.contentCard, cardStyle]}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, textStyle]}>{item.title}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            </View>
            
            <Text style={[styles.cardDescription, textStyle]}>{item.description}</Text>
            
            <View style={styles.cardFooter}>
              <Text style={[styles.durationText, { color: isDarkMode ? '#aaa' : '#666' }]}>
                ⏱️ {item.duration}
              </Text>
              <Text style={[styles.startText, { color: getCategoryColor(item.category) }]}>
                Start Learning →
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  contentCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  startText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ContentScreen;
