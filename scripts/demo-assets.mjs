import { mkdir, writeFile } from 'node:fs/promises';

// Original, deterministic vector publications. No network or image dependencies.
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const text = (x, y, value, size = 20, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(value)}</text>`;
const line =
  '<path d="M42 88H558M42 714H558" fill="none" stroke="currentColor" stroke-opacity=".3"/>';
const chair = `<g transform="translate(110 300)">
  <path d="M80 210L55 345M270 210L300 345" stroke="#503b2e" stroke-width="18"/>
  <rect x="55" y="45" width="245" height="155" rx="65" fill="#b36242"/>
  <path d="M40 170Q175 120 315 170V235H40Z" fill="#cd7d56"/>
  <path d="M55 180H300" stroke="#e9ad82" stroke-width="3"/>
</g>`;
const lamp = `<g transform="translate(300 350)">
  <ellipse cy="300" rx="110" ry="12" fill="#273c36" opacity=".12"/>
  <path d="M0 50V280" stroke="#273c36" stroke-width="10"/>
  <path d="M-118 70A118 118 0 0 1 118 70Z" fill="#c87948"/>
  <ellipse cy="70" rx="118" ry="17" fill="#f3c98b"/>
  <path d="M-70 285Q0 250 70 285V295H-70Z" fill="#273c36"/>
</g>`;
const objects = `<g transform="translate(100 340)">
  <ellipse cx="200" cy="295" rx="190" ry="16" fill="#273c36" opacity=".1"/>
  <path d="M65 75H125V125Q190 150 168 275H22Q0 150 65 125Z" fill="#b8674c"/>
  <ellipse cx="95" cy="76" rx="30" ry="8" fill="#633f30"/>
  <path d="M250 140H330V170Q365 200 352 285H228Q215 200 250 170Z" fill="#e1b35e"/>
  <ellipse cx="290" cy="140" rx="40" ry="9" fill="#826136"/>
  <path d="M160 245H245V285H160Z" fill="#385b4b"/>
</g>`;
const room = `<g transform="translate(42 300)">
  <rect width="516" height="350" fill="#d5d9ca"/>
  <path d="M0 250H516V350H0Z" fill="#b7b59f"/>
  <path d="M280 35H465V245H280Z" fill="#f7f2d9"/>
  <path d="M372 35V245M280 145H465" stroke="#697d68" stroke-width="7"/>
  <path d="M0 350L210 250H516M210 0V250" stroke="#87947b" fill="none" stroke-width="2"/>
  <rect x="40" y="190" width="210" height="65" rx="12" fill="#986d52"/>
  <rect x="40" y="150" width="210" height="70" rx="22" fill="#ba9573"/>
  <path d="M55 255V280M235 255V280" stroke="#354a3c" stroke-width="7"/>
  <circle cx="410" cy="225" r="40" fill="#56785a"/>
  <path d="M410 240V290" stroke="#354a3c" stroke-width="7"/>
</g>`;
const plan = `<g transform="translate(85 310)" fill="none" stroke="#f2ebdc">
  <rect x="0" y="0" width="430" height="320" stroke-width="9"/>
  <rect x="145" y="85" width="140" height="150" stroke-width="5"/>
  <path d="M145 0V85M285 0V85M0 160H145M285 160H430M145 235V320M285 235V320" stroke-width="5"/>
  <path d="M-20 0H-40V320H-20M0 345V365H430V345" stroke-width="1"/>
  <circle cx="215" cy="160" r="38" fill="#8caa81" stroke="none"/>
  <path d="M195 160H235M215 140V180" stroke="#294b3b" stroke-width="2"/>
  <rect x="22" y="22" width="90" height="110" stroke-width="2"/>
  <rect x="315" y="205" width="85" height="70" stroke-width="2"/>
</g>`;
const print = `<g transform="translate(110 315)">
  <rect x="30" y="25" width="340" height="300" fill="#263e35" opacity=".15"/>
  <rect width="340" height="300" fill="#bd4d35"/>
  <circle cx="170" cy="130" r="85" fill="#edbe6d"/>
  <path d="M85 130H255V215H85Z" fill="#314b3b"/>
  <g fill="#fff5dc" font-family="Arial,sans-serif">${text(25, 270, 'THE EVERYDAY / 01', 18)}</g>
</g>`;

const catalog = [
  {
    title: ['Objects for', 'every day.'],
    kicker: 'FORM & FIELD / COLLECTION 01',
    subtitle: 'Considered furniture. Familiar rituals.',
    art: chair,
    bg: '#efe7d7',
  },
  {
    title: ['A place', 'to pause.'],
    kicker: '01 / SEATING',
    subtitle: 'Arc lounge chair / Oak, woven linen',
    art: chair,
    bg: '#e9dfce',
  },
  {
    title: ['Built to', 'stay awhile.'],
    kicker: '01 / MATERIAL NOTES',
    subtitle: 'Soft edges. Honest materials. Everyday comfort.',
    art: room,
    bg: '#f2ede2',
  },
  {
    title: ['A softer', 'kind of light.'],
    kicker: '02 / LIGHTING',
    subtitle: 'Dome table lamp / Terracotta, warm brass',
    art: lamp,
    bg: '#e8c4a2',
  },
  {
    title: ['From morning', 'to evening.'],
    kicker: '02 / IN GOOD COMPANY',
    subtitle: 'Small details that make a room feel like home.',
    art: lamp,
    bg: '#f3e9d5',
  },
  {
    title: ['The little', 'things matter.'],
    kicker: '03 / OBJECTS',
    subtitle: 'Vessels & trays / A study in shape and texture',
    art: objects,
    bg: '#e2e7d9',
  },
];
const portfolio = [
  {
    title: ['A thoughtful', 'point of view.'],
    kicker: 'STUDIO NORTH / SELECTED WORK',
    subtitle: 'Spaces, objects and printed matter / 2026',
    art: room,
    bg: '#e9ece2',
  },
  {
    title: ['Quiet', 'spaces.'],
    kicker: '01 / INTERIORS',
    subtitle: 'A reading room shaped by light and natural materials.',
    art: room,
    bg: '#e7dfcc',
  },
  {
    title: ['Courtyard', 'house.'],
    kicker: '02 / ARCHITECTURE',
    subtitle: 'A home arranged around an open garden.',
    art: plan,
    bg: '#294b3b',
    ink: '#f2ebdc',
  },
  {
    title: ['Objects', 'in balance.'],
    kicker: '03 / OBJECT DESIGN',
    subtitle: 'A collection of vessels exploring proportion.',
    art: objects,
    bg: '#f2e3d0',
  },
  {
    title: ['Printed', 'matter.'],
    kicker: '04 / EDITORIAL',
    subtitle: 'An independent journal about everyday creativity.',
    art: print,
    bg: '#e4e7da',
  },
  {
    title: ['Good things', 'start here.'],
    kicker: 'STUDIO NORTH / NEXT CHAPTER',
    subtitle: 'An original sample portfolio made for Folio3D.',
    art: '<circle cx="300" cy="490" r="130" fill="#bd4d35"/><path d="M220 490H380M300 410V570" stroke="#f2ebdc" stroke-width="6"/>',
    bg: '#d9e1d2',
  },
];

for (const [name, pages] of Object.entries({ catalog, portfolio })) {
  await mkdir(`demo/public/samples/${name}`, { recursive: true });
  for (const [index, page] of pages.entries()) {
    const ink = page.ink ?? '#283e34';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-labelledby="title desc">
<title id="title">${escape(page.title.join(' '))}</title><desc id="desc">${escape(page.subtitle)}</desc>
<rect width="600" height="800" fill="${page.bg}"/>
<g color="${ink}">${line}</g>
<g fill="${ink}" font-family="Arial,Helvetica,sans-serif">
${text(42, 57, page.kicker, 14, 'letter-spacing="2"')}
${text(42, 170, page.title[0], 60, 'font-family="Georgia,serif"')}
${text(42, 235, page.title[1], 60, 'font-family="Georgia,serif"')}
${text(42, 278, page.subtitle, 17)}
${text(42, 753, 'FOLIO3D / ORIGINAL DEMO PUBLICATION', 11, 'letter-spacing="1.4"')}
${text(530, 755, String(index + 1).padStart(2, '0'), 22)}
</g>${page.art}</svg>`;
    await writeFile(`demo/public/samples/${name}/page-${index + 1}.svg`, svg);
  }
}
console.log('Generated 12 original catalog and portfolio pages.');
