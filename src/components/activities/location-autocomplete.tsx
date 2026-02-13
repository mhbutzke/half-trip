'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LIBRARIES: 'places'[] = ['places'];

export type LocationCoords = {
  lat: number;
  lng: number;
  place_id: string;
};

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  onPlaceSelect?: (coords: LocationCoords | null) => void;
  initialCoords?: LocationCoords | null;
  placeholder?: string;
  className?: string;
  types?: string[];
}

export function LocationAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  initialCoords,
  placeholder = 'Ex: Aeroporto GRU',
  className,
  types,
}: LocationAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES,
    preventGoogleFontsLoading: true,
  });

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCoords, setSelectedCoords] = useState<LocationCoords | null>(
    initialCoords || null
  );
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize services when API loads
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      try {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        // PlacesService needs a DOM element or map
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      } catch {
        // API not properly activated - will fallback to plain input
        // since autocompleteServiceRef remains null
      }
    }
  }, [isLoaded]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    (input: string) => {
      if (!autocompleteServiceRef.current || !input.trim()) {
        setSuggestions([]);
        setHighlightedIndex(-1);
        return;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current!,
          ...(types && { types }),
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setHighlightedIndex(-1);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setHighlightedIndex(-1);
          }
        }
      );
    },
    [types]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);

      // Clear selected coords when user types (they're editing the location)
      if (selectedCoords) {
        setSelectedCoords(null);
        onPlaceSelect?.(null);
      }

      // Debounce API calls
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 300);
    },
    [onChange, fetchSuggestions, selectedCoords, onPlaceSelect]
  );

  const handleSelectPlace = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      onChange(prediction.description);
      setShowSuggestions(false);
      setSuggestions([]);
      setHighlightedIndex(-1);

      // Only fetch place details if coords are needed
      if (!onPlaceSelect) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        return;
      }

      // Get place details for coordinates
      if (placesServiceRef.current) {
        placesServiceRef.current.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['geometry', 'name'],
            sessionToken: sessionTokenRef.current!,
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
              const coords: LocationCoords = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                place_id: prediction.place_id,
              };
              setSelectedCoords(coords);
              onPlaceSelect(coords);
              // Renew session token after a selection
              sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
            }
          }
        );
      }
    },
    [onChange, onPlaceSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelectPlace(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, highlightedIndex, handleSelectPlace]
  );

  const clearLocation = useCallback(() => {
    onChange('');
    setSelectedCoords(null);
    onPlaceSelect?.(null);
    setSuggestions([]);
    setHighlightedIndex(-1);
    setShowSuggestions(false);
  }, [onChange, onPlaceSelect]);

  const mapsUrl = selectedCoords
    ? `https://www.google.com/maps/search/?api=1&query=${selectedCoords.lat},${selectedCoords.lng}&query_place_id=${selectedCoords.place_id}`
    : null;

  // Fallback: no API key, API not loaded, load error, or Places API not available
  const placesAvailable =
    isLoaded && !loadError && typeof window !== 'undefined' && !!window.google?.maps?.places;
  if (!apiKey || !placesAvailable) {
    return (
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          className={className}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="location-suggestions-listbox"
          aria-activedescendant={
            highlightedIndex >= 0 && showSuggestions && suggestions[highlightedIndex]
              ? `location-option-${suggestions[highlightedIndex].place_id}`
              : undefined
          }
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            onClick={clearLocation}
            aria-label="Limpar local"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul
            className="max-h-60 overflow-auto py-1"
            role="listbox"
            id="location-suggestions-listbox"
          >
            {suggestions.map((prediction, index) => (
              <li
                key={prediction.place_id}
                id={`location-option-${prediction.place_id}`}
                role="option"
                aria-selected={index === highlightedIndex}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent',
                  index === highlightedIndex && 'bg-accent'
                )}
                onClick={() => handleSelectPlace(prediction)}
              >
                <MapPin
                  className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Google Maps link when a place is selected */}
      {selectedCoords && mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Ver no Google Maps (abre em nova aba)"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Ver no Google Maps
        </a>
      )}
    </div>
  );
}
