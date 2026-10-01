import React from "react";
import styles from "./loading-state.module.css";

export type SpinnerSize = "sm" | "md" | "lg";

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
  "aria-hidden"?: boolean;
}

export function LoadingSpinner({
  size = "md",
  label = "Cargando...",
  className = "",
  "aria-hidden": ariaHidden,
}: LoadingSpinnerProps) {
  const sizeClass =
    size === "sm"
      ? styles.spinnerSm
      : size === "lg"
        ? styles.spinnerLg
        : styles.spinnerMd;

  return (
    <div
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden}
      className={`${styles.spinnerWrapper} ${className}`.trim()}
    >
      <svg
        className={`${styles.spinner} ${sizeClass}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="30"
          strokeDashoffset="10"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {!ariaHidden && label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function LoadingSkeleton({
  width = "100%",
  height = "1.25rem",
  borderRadius,
  className = "",
  style,
  ...rest
}: LoadingSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.skeleton} ${className}`.trim()}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius:
          typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
      {...rest}
    />
  );
}

export interface LoadingStateProps {
  message?: string;
  size?: SpinnerSize;
  className?: string;
}

export function LoadingState({
  message = "Cargando información...",
  size = "md",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.loadingContainer} ${className}`.trim()}
    >
      <LoadingSpinner size={size} aria-hidden={true} />
      {message && <p>{message}</p>}
    </div>
  );
}
