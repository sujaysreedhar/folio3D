import { mkdir, writeFile, cp } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { deflateSync } from 'node:zlib';

await mkdir('tests/fixtures', { recursive: true });
await mkdir('demo/public/samples', { recursive: true });
const colors = ['#cb4b31', '#ede9df', '#253d38', '#e8b455', '#b7c9d2', '#e6ddd1'];
for (let i = 1; i <= 6; i++) {
  const dark = i === 1 || i === 3;
  const ink = dark ? '#fff9ef' : '#233c36';
  const subtitle = ['Objects &amp; ideas', 'A slower kind of reading', 'Form follows curiosity', 'Made to be explored', 'Room for a new perspective', 'Until the next chapter'][i - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="${colors[i-1]}"/><g fill="${ink}" font-family="Arial,sans-serif"><text x="42" y="58" font-size="16" letter-spacing="4">FIELDNOTES / VOL. 01</text><text x="42" y="${i===1?190:160}" font-size="${i===1?76:54}" font-weight="bold">${i===1?'Small':'A different'}</text><text x="42" y="${i===1?270:222}" font-size="${i===1?76:54}" font-weight="bold">${i===1?'wonders.':'point of view.'}</text><text x="44" y="320" font-size="19">${subtitle}</text><text x="42" y="752" font-size="14" letter-spacing="2">FOLIO3D — ORIGINAL EDITION</text><text x="538" y="752" font-size="24">${String(i).padStart(2,'0')}</text></g><g transform="translate(300 515)"><circle r="134" fill="${dark?'#edbc63':'#cb4b31'}"/><path d="M-134 0 A134 134 0 0 0 134 0" fill="${dark?'#f6e7c5':'#253d38'}"/><ellipse rx="134" ry="40" fill="none" stroke="${ink}" stroke-width="2"/><path d="M0-134V134M-134 0H134" stroke="${ink}" stroke-width="2"/></g><path d="M555 28h18v32h-9V42h-9z" fill="${ink}"/></svg>`;
  await writeFile(`tests/fixtures/page-${i}.svg`, svg);
  await writeFile(`demo/public/samples/page-${i}.svg`, svg);
}
function crc32(buf) { let c=0xffffffff; for(const b of buf){c^=b;for(let i=0;i<8;i++) c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0; }
function chunk(type, data) { const t=Buffer.from(type); const n=Buffer.alloc(4); n.writeUInt32BE(data.length); const c=Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t,data]))); return Buffer.concat([n,t,data,c]); }
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(240,0);ihdr.writeUInt32BE(320,4);ihdr[8]=8;ihdr[9]=2;
const pixels=Buffer.alloc(320*(1+240*3));
for(let y=0;y<320;y++)for(let x=0;x<240;x++){const k=y*721+1+x*3;const line=y%24<3&&x>20&&x<210;pixels[k]=line?45:236;pixels[k+1]=line?65:231;pixels[k+2]=line?58:217;}
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
await writeFile('tests/fixtures/scan.png',png);
for(const [name,count] of [['magazine',6],['large',200],['mixed',4],['scanned',3]]){
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const image=name==='scanned'?await pdf.embedPng(png):null;
  for(let n=1;n<=count;n++){
    const wide=name==='mixed'&&n===2;const page=pdf.addPage(wide?[800,500]:[600,800]);const {width,height}=page.getSize();
    if(name==='mixed'&&n===3)page.setRotation(degrees(90));
    const bg=n%3===1?rgb(.8,.29,.19):n%3===0?rgb(.15,.24,.22):rgb(.93,.91,.87);const ink=n%3===2?rgb(.15,.24,.22):rgb(.99,.97,.93);
    page.drawRectangle({x:0,y:0,width,height,color:bg});
    if(image)page.drawImage(image,{x:20,y:40,width:width-40,height:height-80});
    else {
      page.drawText('FIELDNOTES / VOL. 01',{x:42,y:height-58,size:16,font,color:ink});
      page.drawText(n===1?'Small wonders.':`Chapter ${n}`,{x:42,y:height-170,size:52,font:bold,color:ink});
      page.drawText('Objects, ideas and a different point of view.',{x:42,y:height-218,size:18,font,color:ink});
      page.drawCircle({x:width/2,y:height*.39,size:Math.min(width,height)*.22,color:rgb(.91,.7,.34)});
      page.drawText('An original sample publication for Folio3D.',{x:42,y:92,size:14,font,color:ink});
    }
    page.drawText(String(n).padStart(2,'0'),{x:width-65,y:38,size:24,font:bold,color:ink});
    page.drawRectangle({x:width-45,y:height-55,width:12,height:30,color:ink});
  }
  await writeFile(`tests/fixtures/${name}.pdf`,await pdf.save());
}
await writeFile('tests/fixtures/malformed.pdf','This is not a PDF.');
await cp('tests/fixtures/magazine.pdf','demo/public/samples/magazine.pdf');
console.log('Generated original image, text, scanned, mixed and 200-page fixtures.');
