/**
 * Monitoring and observability utilities
 *
 * This module provides centralized monitoring, metrics tracking,
 * and error reporting for the Half Trip application.
 */

import { logError, logInfo, logWarning } from '@/lib/errors/logger';

/**
 * Metric types we track
 */
export type MetricType =
  | 'page_view'
  | 'user_action'
  | 'api_call'
  | 'error'
  | 'performance'
  | 'business_event';

/**
 * Metric data structure
 */
export interface Metric {
  type: MetricType;
  name: string;
  value?: number;
  unit?: string;
  tags?: Record<string, string | number | boolean>;
  timestamp?: number;
}

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error tracking data
 */
export interface ErrorEvent {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  tripId?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Track a custom metric
 */
export function trackMetric(metric: Metric): void {
  const metricData = {
    ...metric,
    timestamp: metric.timestamp || Date.now(),
  };

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    logInfo('Metric tracked', metricData);
  }

  // In production, metrics would be sent to analytics service
  // This is where you'd integrate with services like:
  // - Vercel Analytics (for page views and web vitals)
  // - Mixpanel or Amplitude (for user behavior)
  // - Custom analytics endpoint

  // Example: Send to custom endpoint
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metricData),
    }).catch((error) => {
      logError(error, { action: 'send-metric' });
    });
  }
}

/**
 * Track a user action
 */
export function trackAction(
  action: string,
  properties?: Record<string, string | number | boolean>
): void {
  trackMetric({
    type: 'user_action',
    name: action,
    tags: properties,
  });
}

/**
 * Track a business event (e.g., trip created, expense added)
 */
export function trackBusinessEvent(
  event: string,
  value?: number,
  metadata?: Record<string, string | number | boolean>
): void {
  trackMetric({
    type: 'business_event',
    name: event,
    value,
    tags: metadata,
  });

  logInfo(`Business event: ${event}`, { value, metadata });
}

/**
 * Track API call performance
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
): void {
  trackMetric({
    type: 'api_call',
    name: `api.${method}.${endpoint}`,
    value: duration,
    unit: 'ms',
    tags: {
      endpoint,
      method,
      statusCode,
      success: statusCode >= 200 && statusCode < 300,
    },
  });

  // Log slow API calls
  if (duration > 2000) {
    logWarning('Slow API call detected', { endpoint, method, duration, statusCode });
  }
}

/**
 * Track performance metric (e.g., component render time)
 */
export function trackPerformance(metric: PerformanceMetric): void {
  trackMetric({
    type: 'performance',
    name: metric.name,
    value: metric.duration,
    unit: 'ms',
    tags: metric.metadata as Record<string, string | number | boolean>,
  });

  // Log slow operations
  if (metric.duration > 1000) {
    logWarning('Slow operation detected', {
      operation: metric.name,
      duration: metric.duration,
      metadata: metric.metadata,
    });
  }
}

/**
 * Track an error event for monitoring
 */
export function trackError(error: ErrorEvent): void {
  trackMetric({
    type: 'error',
    name: error.message,
    tags: {
      severity: error.severity,
      userId: error.userId || 'anonymous',
      tripId: error.tripId || 'none',
      hasStack: !!error.stack,
    },
  });

  logError(error.message, {
    ...error.context,
    stack: error.stack,
    userId: error.userId,
    tripId: error.tripId,
  });
}

/**
 * Performance monitoring helper using Performance API
 */
export class PerformanceMonitor {
  private startMarks: Map<string, number> = new Map();

  /**
   * Start measuring performance for an operation
   */
  start(operationName: string): void {
    this.startMarks.set(operationName, performance.now());
  }

  /**
   * End measurement and track the metric
   */
  end(operationName: string, metadata?: Record<string, unknown>): number | null {
    const startTime = this.startMarks.get(operationName);
    if (!startTime) {
      logWarning('Performance measurement ended without start', { operationName });
      return null;
    }

    const duration = performance.now() - startTime;
    this.startMarks.delete(operationName);

    trackPerformance({
      name: operationName,
      duration,
      startTime,
      metadata,
    });

    return duration;
  }

  /**
   * Measure an async function
   */
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.start(operationName);
    try {
      const result = await fn();
      this.end(operationName, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operationName, { ...metadata, success: false });
      throw error;
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Health check utilities
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    storage: boolean;
    realtime: boolean;
  };
  timestamp: number;
}

/**
 * Check system health (to be called periodically)
 */
export async function checkHealth(): Promise<HealthStatus> {
  // This would perform actual health checks in production
  // For now, we return a basic status
  return {
    status: 'healthy',
    checks: {
      database: true,
      storage: true,
      realtime: true,
    },
    timestamp: Date.now(),
  };
}

/**
 * Supabase monitoring helpers
 */
export const supabaseMetrics = {
  /**
   * Track a Supabase query
   */
  trackQuery(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    duration: number,
    success: boolean
  ): void {
    trackMetric({
      type: 'api_call',
      name: `supabase.${operation}.${table}`,
      value: duration,
      unit: 'ms',
      tags: {
        table,
        operation,
        success,
      },
    });
  },

  /**
   * Track Supabase storage operation
   */
  trackStorage(
    operation: 'upload' | 'download' | 'delete',
    bucket: string,
    duration: number,
    fileSize?: number
  ): void {
    trackMetric({
      type: 'api_call',
      name: `supabase.storage.${operation}`,
      value: duration,
      unit: 'ms',
      tags: {
        bucket,
        operation,
        fileSize: fileSize || 0,
      },
    });
  },

  /**
   * Track realtime events
   */
  trackRealtime(event: 'connected' | 'disconnected' | 'error' | 'message'): void {
    trackMetric({
      type: 'api_call',
      name: `supabase.realtime.${event}`,
      tags: { event },
    });
  },
};

/**
 * Browser Web Vitals tracking (automatic with Vercel Speed Insights)
 * This provides a fallback/additional tracking mechanism
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals using Performance Observer
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number;
          loadTime?: number;
        };
        const lcp = lastEntry.renderTime || lastEntry.loadTime || 0;

        trackMetric({
          type: 'performance',
          name: 'web_vitals.lcp',
          value: lcp,
          unit: 'ms',
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
          trackMetric({
            type: 'performance',
            name: 'web_vitals.fid',
            value: fid,
            unit: 'ms',
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as LayoutShift).hadRecentInput) {
            clsValue += (entry as LayoutShift).value;
          }
        });
        trackMetric({
          type: 'performance',
          name: 'web_vitals.cls',
          value: clsValue,
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      logWarning('Failed to initialize Web Vitals tracking', { error });
    }
  }
}

// Types for Performance API
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}
