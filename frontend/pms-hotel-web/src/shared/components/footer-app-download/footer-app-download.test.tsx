import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FooterAppDownload } from './footer-app-download';

describe('FooterAppDownload component', () => {
  it('renders Android and iOS app download cards with official logos', () => {
    render(<FooterAppDownload />);

    const androidBtn = screen.getByRole('link', {
      name: /Descargar APK \/ Para Android/i,
    });
    expect(androidBtn).toBeInTheDocument();
    expect(androidBtn).toHaveAttribute('download');
    expect(androidBtn).toHaveAttribute('href', expect.stringContaining('.apk'));

    expect(screen.getByText('Descargar APK')).toBeInTheDocument();
    expect(screen.getByText('Para Android')).toBeInTheDocument();
    expect(screen.getByText('App Store')).toBeInTheDocument();
    expect(screen.getByText('Muy pronto')).toBeInTheDocument();
  });
});
