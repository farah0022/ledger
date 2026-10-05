import fs from 'fs';
import zlib from 'zlib';

function createSolidPNG(width, height, r, g, b, a = 255) {
  // Simple uncompressed/deflated raw RGBA PNG generator
  function crc32(buf) {
    let table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Pixel data with scanline filter 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  
  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) * 0.45;
  const innerR = Math.min(width, height) * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside rounded corner rectangle or symbol
      const cornerR = width * 0.18;
      const inBoxX = Math.abs(dx) <= (cx - cornerR);
      const inBoxY = Math.abs(dy) <= (cy - cornerR);
      const inCorner = Math.sqrt(Math.pow(Math.abs(dx) - (cx - cornerR), 2) + Math.pow(Math.abs(dy) - (cy - cornerR), 2)) <= cornerR;

      const inRoundedCard = inBoxX || inBoxY || inCorner;

      if (!inRoundedCard) {
        // Transparent outside
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Check inner icon: a stylized ledger book with coin
      // Ledger base: center rectangle
      const inLedger = Math.abs(dx) <= width * 0.24 && Math.abs(dy) <= height * 0.28;
      const inSpine = Math.abs(dx + width * 0.2) <= width * 0.04 && Math.abs(dy) <= height * 0.28;
      const inLine1 = Math.abs(dx - width * 0.04) <= width * 0.14 && Math.abs(dy + height * 0.1) <= height * 0.02;
      const inLine2 = Math.abs(dx - width * 0.04) <= width * 0.14 && Math.abs(dy - height * 0.0) <= height * 0.02;
      const inLine3 = Math.abs(dx - width * 0.04) <= width * 0.1 && Math.abs(dy - height * 0.1) <= height * 0.02;

      if (inSpine || inLine1 || inLine2 || inLine3) {
        // Crisp white mark
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = 255;
      } else {
        // Deep emerald background #146C43
        rawData[pxOffset] = 20;
        rawData[pxOffset + 1] = 108;
        rawData[pxOffset + 2] = 67;
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

// Generate PWA Icons
fs.writeFileSync('./public/pwa-192x192.png', createSolidPNG(192, 192));
fs.writeFileSync('./public/pwa-512x512.png', createSolidPNG(512, 512));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createSolidPNG(512, 512));
fs.writeFileSync('./public/apple-touch-icon.png', createSolidPNG(180, 180));

// Generate SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#146C43"/>
  <rect x="136" y="116" width="240" height="280" rx="24" fill="#0E4B2E"/>
  <rect x="156" y="136" width="200" height="240" rx="16" fill="#FFFFFF"/>
  <rect x="156" y="136" width="40" height="240" rx="8" fill="#E8ECE9"/>
  <rect x="220" y="180" width="110" height="18" rx="9" fill="#146C43"/>
  <rect x="220" y="226" width="110" height="18" rx="9" fill="#146C43"/>
  <rect x="220" y="272" width="80" height="18" rx="9" fill="#146C43"/>
  <circle cx="360" cy="360" r="48" fill="#D97706" stroke="#FFFFFF" stroke-width="8"/>
  <text x="360" y="378" font-family="system-ui, sans-serif" font-size="44" font-weight="bold" fill="#FFFFFF" text-anchor="middle">$</text>
</svg>`;

fs.writeFileSync('./public/icon.svg', svg);
console.log('PWA icons generated successfully in /public');
