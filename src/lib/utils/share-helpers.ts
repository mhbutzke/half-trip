import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Activity } from '@/types/database';
import { getCategoryLabel, formatDuration, formatTime } from './activity-categories';

/**
 * Share Helpers
 *
 * Utilities for sharing trip information via WhatsApp, SMS, clipboard, etc.
 */

/**
 * Format a day's itinerary as text for sharing
 */
export function formatDayItinerary(
  activities: Activity[],
  date: string,
  tripName?: string
): string {
  const formattedDate = format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR });

  const sortedActivities = [...activities].sort((a, b) => {
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  let text = tripName ? `📍 ${tripName}\n` : '';
  text += `📅 ${capitalizeFirst(formattedDate)}\n\n`;

  if (sortedActivities.length === 0) {
    text += 'Nenhuma atividade planejada para este dia.\n';
  } else {
    sortedActivities.forEach((activity, index) => {
      const categoryLabel = getCategoryLabel(activity.category);
      const timeStr = activity.start_time ? `${formatTime(activity.start_time)} - ` : '';
      const durationStr = activity.duration_minutes
        ? ` (${formatDuration(activity.duration_minutes)})`
        : '';

      text += `${index + 1}. ${timeStr}${activity.title}${durationStr}\n`;
      text += `   📂 ${categoryLabel}\n`;

      if (activity.location) {
        text += `   📍 ${activity.location}\n`;
      }

      if (activity.description) {
        text += `   💬 ${activity.description}\n`;
      }

      text += '\n';
    });
  }

  text += '---\n';
  text += '✈️ Criado com Half Trip';

  return text;
}

/**
 * Share day itinerary via Web Share API or fallback to clipboard
 */
export async function shareDayItinerary(
  activities: Activity[],
  date: string,
  tripName?: string,
  tripUrl?: string
): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
  const text = formatDayItinerary(activities, date, tripName);

  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title: tripName ? `${tripName} - Roteiro` : 'Roteiro do Dia',
        text,
        url: tripUrl,
      });
      return { success: true, method: 'share' };
    } catch (error) {
      // User cancelled or error - fall through to clipboard
      if ((error as Error).name === 'AbortError') {
        return { success: false, method: 'share' };
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, method: 'clipboard' };
  }
}

/**
 * Share via WhatsApp Web
 */
export function shareViaWhatsApp(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}

/**
 * Generate shareable link for a specific day
 */
export function getDayShareUrl(tripId: string, date: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/trip/${tripId}/itinerary?date=${date}`;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
