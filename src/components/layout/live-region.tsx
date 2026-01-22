/**
 * Live Region for Screen Reader Announcements
 *
 * Provides an ARIA live region for announcing dynamic content changes
 * to screen reader users.
 *
 * WCAG 2.1 Criterion 4.1.3: Status Messages
 */

'use client';

import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message?: string;
  priority?: 'polite' | 'assertive';
}

/**
 * Global live region component
 * Place once in the app layout
 */
export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (message) {
      // This is an exception: we need to update state to trigger screen reader announcement
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnouncement(message);
      // Clear after announcement to allow same message to be announced again
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <>
      {/* Polite announcements (default) */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {priority === 'polite' ? announcement : ''}
      </div>

      {/* Assertive announcements (urgent) */}
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {priority === 'assertive' ? announcement : ''}
      </div>
    </>
  );
}
