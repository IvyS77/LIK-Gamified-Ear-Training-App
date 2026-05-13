import React from 'react';
import { StyleSheet, Pressable, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

interface LevelNodeProps {
  level: number;
  title: string;
  isLocked: boolean;
  onPress: () => void;
  style?: ViewStyle; // For custom positioning
}

export function LevelNode({ level, title, isLocked, onPress, style }: LevelNodeProps) {
  return (
    <View style={[styles.container, style]}>
      {/* The Circular Node */}
      <Pressable 
        onPress={onPress}
        disabled={isLocked}
        style={({ pressed }) => [
          styles.node,
          { 
            backgroundColor: isLocked ? '#1F2937' : '#38BDF8',
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: isLocked ? '#000' : '#38BDF8',
          }
        ]}
      >
        {isLocked ? (
          <Ionicons name="lock-closed" size={26} color="#4B5563" />
        ) : (
          <View style={styles.activeContent}>
            <ThemedText style={styles.levelNumber}>{level}</ThemedText>
            {/* Minimalist Piano Key Icon decoration */}
            <Ionicons name="musical-notes" size={12} color="rgba(255,255,255,0.6)" />
          </View>
        )}
      </Pressable>

      {/* Label for the Level */}
      <View style={styles.textContainer}>
        <ThemedText style={[styles.title, { color: isLocked ? '#4B5563' : '#F2F2F2' }]}>
          {title}
        </ThemedText>
        {!isLocked && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>READY</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
    width: 140, // Fixed width for easy path calculations
  },
  node: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.05)',
    // Professional Shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeContent: {
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    lineHeight: 32,
  },
  textContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  badge: {
    marginTop: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
