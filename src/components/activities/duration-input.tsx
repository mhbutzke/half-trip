'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { minutesToHHmm, hhmmToMinutes } from '@/lib/utils/activity-categories';

interface DurationInputProps {
  value: number | null | undefined;
  onChange: (minutes: number | null) => void;
  className?: string;
}

export function DurationInput({ value, onChange, className }: DurationInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Sync external value → display
  useEffect(() => {
    setDisplayValue(minutesToHHmm(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only digits and colon while typing
    const filtered = raw.replace(/[^\d:]/g, '');
    setDisplayValue(filtered);
  }, []);

  const handleBlur = useCallback(() => {
    if (!displayValue.trim()) {
      onChange(null);
      setDisplayValue('');
      return;
    }

    // Auto-format: if user typed just digits like "230", convert to "2:30"
    let normalized = displayValue.trim();

    // If no colon present, try to interpret as hours:minutes
    if (!normalized.includes(':')) {
      if (normalized.length <= 2) {
        // "2" → "02:00" (interpret as hours)
        normalized = `${normalized}:00`;
      } else if (normalized.length === 3) {
        // "230" → "2:30"
        normalized = `${normalized[0]}:${normalized.slice(1)}`;
      } else if (normalized.length === 4) {
        // "0230" → "02:30"
        normalized = `${normalized.slice(0, 2)}:${normalized.slice(2)}`;
      }
    }

    // Normalize "2:30" → "02:30"
    const parts = normalized.split(':');
    if (parts.length === 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      normalized = `${h}:${m}`;
    }

    const minutes = hhmmToMinutes(normalized);
    if (minutes !== null) {
      onChange(minutes);
      setDisplayValue(minutesToHHmm(minutes));
    } else {
      // Invalid input, reset
      onChange(null);
      setDisplayValue('');
    }
  }, [displayValue, onChange]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="HH:mm"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
