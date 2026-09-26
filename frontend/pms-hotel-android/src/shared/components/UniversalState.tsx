import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/shared/theme/tokens';

export type UniversalStateKind = 'loading' | 'error' | 'empty' | 'offline';

export interface UniversalStateAction {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}

interface UniversalStateBaseProps {
  accessibilityLabel?: string;
  body?: string;
  testID?: string;
  title: string;
}

export type UniversalStateProps =
  | (UniversalStateBaseProps & { kind: 'loading' })
  | (UniversalStateBaseProps & { kind: 'error'; retry?: UniversalStateAction })
  | (UniversalStateBaseProps & { action?: UniversalStateAction; kind: 'empty' })
  | (UniversalStateBaseProps & { kind: 'offline'; retry?: UniversalStateAction });

/**
 * Presentation-only foundation for async screen states. Features own copy,
 * actions, data fetching, mutations and state transitions.
 */
export function UniversalState(props: UniversalStateProps) {
  const action = props.kind === 'empty' ? props.action : props.kind === 'error' || props.kind === 'offline' ? props.retry : undefined;
  const stateLabel = props.accessibilityLabel ?? [props.title, props.body].filter(Boolean).join('. ');

  return (
    <View
      accessibilityLabel={stateLabel}
      accessibilityLiveRegion="polite"
      style={[styles.container, props.kind === 'offline' && styles.offline, props.kind === 'empty' && styles.empty]}
      testID={props.testID}
    >
      {props.kind === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel={stateLabel}
          accessibilityState={{ busy: true }}
          color={tokens.color.brand}
          testID={props.testID ? `${props.testID}-indicator` : undefined}
        />
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>{props.title}</Text>
      {props.body ? <Text style={styles.body}>{props.body}</Text> : null}
      {action ? (
        <Pressable
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(action.disabled) }}
          disabled={action.disabled}
          onPress={action.onPress}
          style={[styles.action, action.disabled && styles.actionDisabled]}
          testID={props.testID ? `${props.testID}-action` : undefined}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.color.white,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    gap: tokens.space.sm,
    padding: tokens.space.lg,
  },
  offline: {
    backgroundColor: tokens.color.pendingSurface,
  },
  empty: {
    backgroundColor: tokens.color.surfaceAccent,
  },
  title: {
    color: tokens.color.inkStrong,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.sectionTitle,
    fontWeight: '600',
  },
  body: {
    color: tokens.color.muted,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.bodyMedium,
  },
  action: {
    alignItems: 'center',
    backgroundColor: tokens.color.brand,
    borderRadius: tokens.radius.control,
    justifyContent: 'center',
    minHeight: tokens.layout.buttonHeight,
    paddingHorizontal: tokens.space.md,
  },
  actionDisabled: {
    backgroundColor: tokens.color.brandSoft,
  },
  actionLabel: {
    color: tokens.color.white,
    fontFamily: tokens.typography.family,
    fontSize: tokens.typography.size.label,
    fontWeight: '600',
  },
});
