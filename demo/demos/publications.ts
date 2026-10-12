import type { Source } from 'folio3d';

// These pages live one directory below the site root, including nested hosting.
const base = new URL('../', document.baseURI);
export const assetBaseUrl = new URL('lib/assets/', base).href;
export interface Publication {
  title: string;
  source: Source;
  sections: Array<{ page: number; title: string; note: string }>;
}
function imageSource(name: string): Source {
  return {
    type: 'images',
    pages: Array.from({ length: 6 }, (_, i) => ({
      src: new URL(`samples/${name}/page-${i + 1}.svg`, base).href,
      alt: `${name === 'catalog' ? 'Form & Field catalog' : 'Studio North portfolio'}, page ${i + 1}`,
    })),
  };
}
export const catalog: Publication = {
  title: 'Form & Field catalog',
  source: imageSource('catalog'),
  sections: [
    {
      page: 1,
      title: 'Collection',
      note: 'Considered furniture and small objects for everyday living.',
    },
    {
      page: 2,
      title: 'Seating',
      note: 'Arc lounge chair. Soft edges, woven linen and a solid oak frame.',
    },
    {
      page: 4,
      title: 'Lighting',
      note: 'Dome table lamp. A warm pool of light, from morning to evening.',
    },
    {
      page: 6,
      title: 'Objects',
      note: 'Sculptural vessels and trays, made for the little rituals.',
    },
  ],
};
export const portfolio: Publication = {
  title: 'Studio North portfolio',
  source: imageSource('portfolio'),
  sections: [
    {
      page: 1,
      title: 'Selected work',
      note: 'A collection of spaces, objects and printed matter. An original demo studio.',
    },
    {
      page: 2,
      title: 'Quiet spaces',
      note: 'A reading room shaped by light and natural materials. Interiors / 2026.',
    },
    {
      page: 3,
      title: 'Courtyard house',
      note: 'A home arranged around an open garden. Architecture / 2026.',
    },
    {
      page: 4,
      title: 'Objects in balance',
      note: 'A collection of vessels exploring proportion. Object design / 2026.',
    },
    {
      page: 5,
      title: 'Printed matter',
      note: 'An independent journal about everyday creativity. Editorial / 2026.',
    },
    {
      page: 6,
      title: 'Next chapter',
      note: 'A little room for your next idea. Replace these samples with your own work.',
    },
  ],
};
export const magazine: Publication = {
  title: 'Fieldnotes magazine',
  source: { type: 'pdf', data: new URL('samples/magazine.pdf', base).href },
  sections: [],
};
