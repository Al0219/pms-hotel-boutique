import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export function getSwipeToDeleteRevealDistance(width: number): number { return width / 2; }

export function SwipeToDelete({ children, deleteLabel, enabled = true, onDelete, testID }: { children: React.ReactNode; deleteLabel: string; enabled?: boolean; onDelete: () => void; testID: string }) {
  const [revealed, setRevealed] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const width = rowWidth || windowWidth;
  const panResponder = useMemo(() => !enabled ? null : PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: (_, gesture) => { if (gesture.dx <= -width / 4) setRevealed(true); else if (gesture.dx >= width / 4) setRevealed(false); },
  }), [enabled, width]);
  const revealDistance = revealed ? getSwipeToDeleteRevealDistance(width) : 0;
  return <View {...panResponder?.panHandlers} onLayout={(event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width)} style={styles.row} testID={testID}>{revealed ? <Pressable accessibilityLabel={deleteLabel} accessibilityRole="button" onPress={() => { setRevealed(false); onDelete(); }} style={[styles.delete, { width: revealDistance }]} testID={`${testID}-delete`}><Text style={styles.icon}>🗑</Text></Pressable> : null}<View pointerEvents={revealed ? 'none' : 'auto'} style={{ transform: [{ translateX: -revealDistance }] }}>{children}</View></View>;
}

const styles = StyleSheet.create({ row: { alignSelf: 'stretch', overflow: 'hidden', position: 'relative', width: '100%' }, delete: { alignItems: 'center', backgroundColor: tokens.color.destructive, bottom: 0, justifyContent: 'center', position: 'absolute', right: 0, top: 0 }, icon: { color: tokens.color.white, fontSize: 30 } });
