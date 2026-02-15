import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationAutocomplete } from './location-autocomplete';

vi.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({
    isLoaded: false,
    loadError: new Error('Google Maps unavailable in test'),
  }),
}));

describe('LocationAutocomplete', () => {
  it('forwards input accessibility props in fallback mode', () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();

    render(
      <LocationAutocomplete
        value=""
        onChange={handleChange}
        placeholder="Destino"
        {...({
          id: 'destination-input',
          name: 'destination',
          onBlur: handleBlur,
        } as unknown as Record<string, unknown>)}
      />
    );

    const input = screen.getByPlaceholderText('Destino');

    expect(input).toHaveAttribute('id', 'destination-input');
    expect(input).toHaveAttribute('name', 'destination');

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
