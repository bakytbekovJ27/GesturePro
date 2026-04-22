import React, { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';

import { theme } from '../constants/theme';

interface PINInputProps {
  onComplete: (pin: string) => void;
  onChange?: (pin: string) => void;
  disabled?: boolean;
}

export const PINInput: React.FC<PINInputProps> = ({ onComplete, onChange, disabled }) => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const inputs = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    if (disabled) {
      return;
    }

    const safeValue = text.replace(/\D/g, '').slice(-1);
    const nextValue = [...pin];
    nextValue[index] = safeValue;
    setPin(nextValue);

    const joined = nextValue.join('');
    onChange?.(joined);

    if (safeValue && index < nextValue.length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (joined.length === 6) {
      onComplete(joined);
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (event.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {pin.map((digit, index) => {
        const filled = Boolean(digit);

        return (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) {
                inputs.current[index] = ref;
              }
            }}
            style={[
              styles.input,
              index !== pin.length - 1 ? styles.inputSpacing : null,
              filled ? styles.inputFilled : null,
              disabled ? styles.inputDisabled : null,
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            editable={!disabled}
            selectTextOnFocus
            selectionColor={theme.colors.primary}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  input: {
    width: 46,
    height: 62,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    textAlign: 'center',
    fontSize: 24,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  inputSpacing: {
    marginRight: theme.spacing.sm,
  },
  inputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  inputDisabled: {
    opacity: 0.5,
  },
});
