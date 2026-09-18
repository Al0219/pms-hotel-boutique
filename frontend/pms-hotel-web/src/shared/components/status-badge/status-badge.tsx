import React from "react";

import styles from "./status-badge.module.css";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "service"
  | "neutral";

export type StatusBadgeSize = "sm" | "md";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
  children: React.ReactNode;
  ariaLabel?: string;
}

const VARIANT_CLASS_MAP: Record<StatusBadgeVariant, string> = {
  success: styles.variantSuccess,
  warning: styles.variantWarning,
  error: styles.variantError,
  info: styles.variantInfo,
  service: styles.variantService,
  neutral: styles.variantNeutral,
};

const SIZE_CLASS_MAP: Record<StatusBadgeSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
};

export function StatusBadge({
  variant = "neutral",
  size = "md",
  children,
  className = "",
  ariaLabel,
  ...rest
}: StatusBadgeProps) {
  const variantClass = VARIANT_CLASS_MAP[variant] || styles.variantNeutral;
  const sizeClass = SIZE_CLASS_MAP[size] || styles.sizeMd;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`${styles.badge} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}
