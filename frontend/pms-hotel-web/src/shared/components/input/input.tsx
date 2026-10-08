import React, { forwardRef, useId } from 'react';
import styles from './input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  isRequired?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      isRequired = false,
      id: customId,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const describedBy = [
      errorMessage ? errorId : null,
      helperText ? helperId : null,
      props['aria-describedby'],
    ]
      .filter(Boolean)
      .join(' ');

    const hasError = Boolean(errorMessage);

    return (
      <div className={styles.container}>
        {label && (
          <div className={styles.labelRow}>
            <label htmlFor={inputId} className={styles.label}>
              {label}
              {isRequired && <span className={styles.requiredAsterisk} aria-hidden="true">*</span>}
            </label>
          </div>
        )}

        <div className={styles.inputWrapper}>
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy || undefined}
            aria-required={isRequired || undefined}
            className={[
              styles.input,
              hasError ? styles.inputError : '',
              className || '',
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
        </div>

        {errorMessage && (
          <p id={errorId} className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        )}

        {!errorMessage && helperText && (
          <p id={helperId} className={styles.helperText}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
