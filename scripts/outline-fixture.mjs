import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { readFile, writeFile, cp } from 'node:fs/promises';

// Add reproducible nested and named destinations to the original six-page sample.
const pdf = await PDFDocument.load(await readFile('tests/fixtures/magazine.pdf'));
const ctx = pdf.context;
const root = ctx.nextRef(),
  first = ctx.nextRef(),
  second = ctx.nextRef(),
  child = ctx.nextRef();
const destination = (page) => ctx.obj([pdf.getPage(page - 1).ref, PDFName.of('Fit')]);
ctx.assign(root, ctx.obj({ Type: 'Outlines', First: first, Last: second, Count: 3 }));
ctx.assign(
  first,
  ctx.obj({
    Title: PDFString.of('Small wonders'),
    Parent: root,
    Dest: destination(1),
    Next: second,
    First: child,
    Last: child,
    Count: 1,
  }),
);
ctx.assign(
  child,
  ctx.obj({ Title: PDFString.of('A slower kind of reading'), Parent: first, Dest: destination(2) }),
);
ctx.assign(
  second,
  ctx.obj({
    Title: PDFString.of('A new perspective'),
    Parent: root,
    Prev: first,
    Dest: PDFString.of('perspective'),
  }),
);
pdf.catalog.set(PDFName.of('Outlines'), root);
pdf.catalog.set(
  PDFName.of('Names'),
  ctx.obj({ Dests: { Names: [PDFString.of('perspective'), destination(5)] } }),
);
await writeFile('tests/fixtures/outline.pdf', await pdf.save());
await cp('tests/fixtures/outline.pdf', 'demo/public/samples/magazine.pdf');
console.log('Generated PDF outline fixture and updated demo sample.');
