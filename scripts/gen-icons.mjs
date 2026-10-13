// Generates PNG icons for the PWA manifest without external deps.
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const set = (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a
  }
  const bg = [11, 15, 20] // #0b0f14
  const fg = [16, 185, 129] // emerald
  const R = size * 0.22 // corner radius
  const inRound = (x, y) => {
    const cx = Math.min(Math.max(x, R), size - R)
    const cy = Math.min(Math.max(y, R), size - R)
    return (x - cx) ** 2 + (y - cy) ** 2 <= R * R || (x >= R && x < size - R) || (y >= R && y < size - R)
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!inRound(x, y)) { set(x, y, 0, 0, 0, 0); continue }
      set(x, y, ...bg)
    }
  // dumbbell: two vertical bars + horizontal bar
  const u = size / 24 // unit
  const bar = (x0, y0, w, h) => {
    for (let y = Math.round(y0 * u); y < Math.round((y0 + h) * u); y++)
      for (let x = Math.round(x0 * u); x < Math.round((x0 + w) * u); x++)
        if (inRound(x, y)) set(x, y, ...fg)
  }
  const cx = 12
  bar(cx - 7, 8, 2.6, 8)   // left plate
  bar(cx + 4.4, 8, 2.6, 8) // right plate
  bar(cx - 4.4, 11.2, 8.8, 1.6) // handle
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = path.join(process.cwd(), 'client', 'public')
fs.writeFileSync(path.join(out, 'icon-192.png'), makeIcon(192))
fs.writeFileSync(path.join(out, 'icon-512.png'), makeIcon(512))
console.log('icons written')
