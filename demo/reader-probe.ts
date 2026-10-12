import { createFlipbook, openFlipbook } from '../src/index';
import '../src/style.css';
const images = {
  type: 'images' as const,
  pages: Array.from({ length: 6 }, (_, i) => ({
    src: `./samples/page-${i + 1}.svg`,
    alt: `Original page ${i + 1}`,
  })),
};
Object.assign(window, { reader: { createFlipbook, openFlipbook, images } });
