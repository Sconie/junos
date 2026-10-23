// Draws the JunOS icon (a soft-green disc with a darker ring) and writes the files the Windows build needs.
//   node apps/desktop/scripts/make-icons.mjs
// No dependencies: the PNG is encoded by hand, and the .ico simply wraps a 256 px PNG.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'icons')
mkdirSync(out, { recursive: true })

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** A size x size RGBA picture, anti-aliased by 4x4 supersampling. */
function render(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const cx = size / 2
  const r = size * 0.46
  const ring = size * 0.07
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let cover = 0
      let ringCover = 0
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const d = Math.hypot(x + (sx + 0.5) / 4 - cx, y + (sy + 0.5) / 4 - cx)
          if (d <= r) cover += 1
          if (d <= r && d > r - ring) ringCover += 1
        }
      }
      const a = cover / 16
      const t = cover === 0 ? 0 : ringCover / cover
      const base = [0x7f, 0xd6, 0xa4]
      const dark = [0x2f, 0x7a, 0x57]
      const o = y * (size * 4 + 1) + 1 + x * 4
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(base[i] * (1 - t) + dark[i] * t)
      raw[o + 3] = Math.round(a * 255)
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

for (const [name, size] of [['icon.png', 512], ['128x128.png', 128], ['128x128@2x.png', 256], ['32x32.png', 32]]) writeFileSync(join(out, name), render(size))

// An .ico is a small directory followed by images; a 256 px entry may hold a PNG as it is.
const png = render(256)
const dir = Buffer.alloc(22)
dir.writeUInt16LE(0, 0) // reserved
dir.writeUInt16LE(1, 2) // type: icon
dir.writeUInt16LE(1, 4) // one image
dir[6] = 0 // width 256
dir[7] = 0 // height 256
dir.writeUInt16LE(1, 10) // planes
dir.writeUInt16LE(32, 12) // bits per pixel
dir.writeUInt32LE(png.length, 14)
dir.writeUInt32LE(22, 18)
writeFileSync(join(out, 'icon.ico'), Buffer.concat([dir, png]))
console.log(`Wrote the icons to ${out}`)
