/**
 * MP3 Duration Utilities
 *
 * @description Calculates the actual audio duration of an MP3 buffer
 * by parsing MPEG frame headers. Supports all MPEG versions (1, 2, 2.5),
 * all layers (1, 2, 3), and both CBR and VBR files.
 *
 * Based on the MPEG audio frame header specification.
 * @see https://www.codeproject.com/Articles/8295/MPEG-Audio-Frame-Header
 */

/** MPEG version lookup by header bits */
const VERSIONS = ['2.5', 'x', '2', '1'] as const;

/** MPEG layer lookup by header bits */
const LAYERS = ['x', '3', '2', '1'] as const;

/** Bitrate lookup tables (kbps) indexed by version+layer and bitrate index */
const BIT_RATES: Record<string, number[]> = {
  V1L1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  V1L2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  V1L3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  V2L1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  V2L2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  V2L3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

/** Sample rate lookup tables (Hz) indexed by MPEG version */
const SAMPLE_RATES: Record<string, number[]> = {
  '1': [44100, 48000, 32000],
  '2': [22050, 24000, 16000],
  '2.5': [11025, 12000, 8000],
};

/** Samples per frame indexed by simple version and layer */
const SAMPLES_PER_FRAME: Record<string, Record<string, number>> = {
  '1': { '1': 384, '2': 1152, '3': 1152 },
  '2': { '1': 384, '2': 1152, '3': 576 },
};

interface FrameHeader {
  bitRate: number;
  sampleRate: number;
  frameSize: number;
  samples: number;
}

/**
 * Parse an MPEG audio frame header from a buffer slice
 */
function parseFrameHeader(header: Buffer): FrameHeader {
  const b1 = header[1];
  const b2 = header[2];

  const versionBits = (b1 & 0x18) >> 3;
  const version = VERSIONS[versionBits];
  const simpleVersion = version === '2.5' ? '2' : version;

  const layerBits = (b1 & 0x06) >> 1;
  const layer = LAYERS[layerBits];

  const bitRateKey = `V${simpleVersion}L${layer}`;
  const bitRateIndex = (b2 & 0xf0) >> 4;
  const bitRate = BIT_RATES[bitRateKey]?.[bitRateIndex] || 0;

  const sampleRateIdx = (b2 & 0x0c) >> 2;
  const sampleRate = SAMPLE_RATES[version]?.[sampleRateIdx] || 0;

  const samples = SAMPLES_PER_FRAME[simpleVersion]?.[layer] || 0;
  const paddingBit = (b2 & 0x02) >> 1;

  let frameSize: number;
  if (layer === '1') {
    frameSize = ((samples * bitRate * 125 / sampleRate) + paddingBit * 4) | 0;
  } else {
    frameSize = ((samples * bitRate * 125) / sampleRate + paddingBit) | 0;
  }

  return { bitRate, sampleRate, frameSize, samples };
}

/**
 * Skip ID3v2 tag at the beginning of the buffer
 *
 * @returns Byte offset after the ID3v2 tag (0 if no tag found)
 */
function skipID3v2(buffer: Buffer): number {
  // ID3v2 header: "ID3" magic bytes
  if (buffer.length >= 10 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    const flags = buffer[5];
    const footerSize = (flags & 0x10) ? 10 : 0;

    // ID3v2 size uses 7-bit encoding (synchsafe integers)
    const z0 = buffer[6];
    const z1 = buffer[7];
    const z2 = buffer[8];
    const z3 = buffer[9];

    if (((z0 & 0x80) === 0) && ((z1 & 0x80) === 0) && ((z2 & 0x80) === 0) && ((z3 & 0x80) === 0)) {
      const tagSize = ((z0 & 0x7f) * 2097152) + ((z1 & 0x7f) * 16384) + ((z2 & 0x7f) * 128) + (z3 & 0x7f);
      return 10 + tagSize + footerSize;
    }
  }

  return 0;
}

/**
 * Calculate the actual audio duration of an MP3 buffer
 *
 * @param buffer - Buffer containing MP3 audio data
 * @returns Duration in milliseconds, or `undefined` if the buffer
 *          is not a valid MP3 or contains no parseable frames
 *
 * @description
 * Parses all MPEG audio frame headers in the buffer and sums up
 * the duration of each frame (`samples / sampleRate`).
 * Handles ID3v2 and ID3v1 tags, VBR and CBR files.
 *
 * @example
 * ```typescript
 * const duration = getMp3Duration(audioBuffer);
 * if (duration !== undefined) {
 *   console.log(`Audio is ${duration}ms long`);
 * }
 * ```
 */
export function getMp3Duration(buffer: Buffer): number | undefined {
  if (!buffer || buffer.length < 100) {
    return undefined;
  }

  let offset = skipID3v2(buffer);
  let duration = 0;
  let framesFound = 0;

  while (offset < buffer.length - 10) {
    // Look for frame sync bits: 1111 1111 111x xxxx
    if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
      const header = parseFrameHeader(buffer.subarray(offset, offset + 10));

      if (header.frameSize > 0 && header.samples > 0 && header.sampleRate > 0) {
        offset += header.frameSize;
        duration += header.samples / header.sampleRate;
        framesFound++;
      } else {
        offset++;
      }
    } else if (buffer[offset] === 0x54 && buffer[offset + 1] === 0x41 && buffer[offset + 2] === 0x47) {
      // "TAG" — ID3v1 tag (128 bytes)
      offset += 128;
    } else {
      offset++;
    }
  }

  if (framesFound === 0) {
    return undefined;
  }

  return Math.round(duration * 1000);
}
