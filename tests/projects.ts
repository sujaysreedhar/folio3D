import type { Project } from '@playwright/test';
export const projects: Project[] = [
  {
    name: 'chromium',
    use: { browserName: 'chromium', channel: process.env.FOLIO_CHROMIUM_CHANNEL },
  },
  { name: 'firefox', use: { browserName: 'firefox' } },
  { name: 'webkit', use: { browserName: 'webkit' } },
  {
    name: 'chromium-mobile',
    use: {
      browserName: 'chromium',
      channel: process.env.FOLIO_CHROMIUM_CHANNEL,
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    },
  },
  {
    name: 'firefox-mobile',
    use: { browserName: 'firefox', viewport: { width: 390, height: 844 }, hasTouch: true },
  },
  {
    name: 'webkit-mobile',
    use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, hasTouch: true },
  },
];
