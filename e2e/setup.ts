import { test as base } from '@playwright/test';

/**
 * E2E test setup and configuration
 */

// Extend base test with custom fixtures if needed
export const test = base.extend({
  // Add custom fixtures here
});

export { expect } from '@playwright/test';
