'use client';
import { createContext } from 'react';

/** Local background layer of a semantic three-cell Staff row. */
export const StaffRowPanelContext = createContext<HTMLElement | null>(null);

export const StaffRowRecoveryPanelContext = createContext<HTMLElement | null>(null);
