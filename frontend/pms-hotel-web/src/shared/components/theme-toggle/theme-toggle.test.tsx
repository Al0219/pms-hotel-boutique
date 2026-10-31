import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders with initial light theme and toggles to dark theme on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Cambiar a modo oscuro/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /Cambiar a modo claro/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cambiar a modo claro/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('restores existing dark preference from localStorage on mount', async () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(screen.getByRole('button', { name: /Cambiar a modo claro/i })).toBeInTheDocument();
    });
  });

  it('renders theme toggle button with descriptive title attribute', () => {
    const { container } = render(<ThemeToggle />);
    expect(container.querySelector('[data-testid="theme-toggle"]')).toBeInTheDocument();
  });
});
