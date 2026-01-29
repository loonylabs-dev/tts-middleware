/**
 * Tests for MP3 Duration Utilities
 *
 * @description Tests MP3 frame header parsing and duration calculation
 * @coverage Target: 100%
 */

import { getMp3Duration } from '../../src/middleware/services/tts/utils/mp3-duration.utils';

/**
 * Build a minimal valid MPEG1 Layer 3 frame header.
 *
 * Frame sync: 0xFFE0 (11 sync bits)
 * MPEG1, Layer 3, no CRC, bitrate 128kbps, sampleRate 44100, no padding
 *
 * Header bytes breakdown:
 *   byte0: 0xFF  — sync
 *   byte1: 0xFB  — sync + MPEG1 (11) + Layer3 (01) + no CRC (1)
 *   byte2: 0x90  — bitrate index 9 = 128kbps (1001), sampleRate index 0 = 44100 (00), no padding (0), private (0)
 *   byte3: 0x00  — channel, mode ext, copyright, original, emphasis (don't matter for duration)
 *
 * Frame size for MPEG1 Layer3:
 *   frameSize = floor(1152 * 128000 / 8 / 44100) + 0 = floor(417.96) = 417 bytes
 *   samples per frame = 1152
 *   duration per frame = 1152 / 44100 ≈ 26.122ms
 */
function createMp3Frame(): Buffer {
  const frameSize = 417;
  const frame = Buffer.alloc(frameSize, 0);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x00;
  return frame;
}

/**
 * Build a minimal ID3v2 header with the given tag body size.
 */
function createID3v2Header(bodySize: number): Buffer {
  const header = Buffer.alloc(10);
  header[0] = 0x49; // 'I'
  header[1] = 0x44; // 'D'
  header[2] = 0x33; // '3'
  header[3] = 0x04; // version
  header[4] = 0x00; // revision
  header[5] = 0x00; // flags (no footer)
  // Synchsafe size encoding (7 bits per byte)
  header[6] = (bodySize >> 21) & 0x7f;
  header[7] = (bodySize >> 14) & 0x7f;
  header[8] = (bodySize >> 7) & 0x7f;
  header[9] = bodySize & 0x7f;
  return header;
}

describe('getMp3Duration', () => {
  describe('Invalid input', () => {
    test('returns undefined for null/undefined buffer', () => {
      expect(getMp3Duration(null as unknown as Buffer)).toBeUndefined();
      expect(getMp3Duration(undefined as unknown as Buffer)).toBeUndefined();
    });

    test('returns undefined for empty buffer', () => {
      expect(getMp3Duration(Buffer.alloc(0))).toBeUndefined();
    });

    test('returns undefined for buffer too small', () => {
      expect(getMp3Duration(Buffer.alloc(50))).toBeUndefined();
    });

    test('returns undefined for non-MP3 data', () => {
      const randomData = Buffer.alloc(500, 0x42);
      expect(getMp3Duration(randomData)).toBeUndefined();
    });
  });

  describe('Single frame', () => {
    test('calculates duration for a single MPEG1 Layer3 frame', () => {
      // Need at least 100 bytes for initial read + frame data
      const frame = createMp3Frame();
      // Pad to ensure buffer is large enough
      const buffer = Buffer.concat([frame, Buffer.alloc(100, 0)]);
      const duration = getMp3Duration(buffer);

      // 1152 / 44100 * 1000 = 26.122... → rounded to 26ms
      expect(duration).toBe(26);
    });
  });

  describe('Multiple frames', () => {
    test('sums duration across multiple frames', () => {
      const frameCount = 10;
      const frames = [];
      for (let i = 0; i < frameCount; i++) {
        frames.push(createMp3Frame());
      }
      const buffer = Buffer.concat([...frames, Buffer.alloc(100, 0)]);
      const duration = getMp3Duration(buffer);

      // 10 * 1152 / 44100 * 1000 = 261.22... → rounded to 261ms
      expect(duration).toBe(261);
    });

    test('handles many frames for longer audio', () => {
      const frameCount = 100;
      const frames = [];
      for (let i = 0; i < frameCount; i++) {
        frames.push(createMp3Frame());
      }
      const buffer = Buffer.concat([...frames, Buffer.alloc(100, 0)]);
      const duration = getMp3Duration(buffer);

      // 100 * 1152 / 44100 * 1000 = 2612.24... → rounded to 2612ms
      expect(duration).toBe(2612);
    });
  });

  describe('ID3 tag handling', () => {
    test('skips ID3v2 header and parses frames after it', () => {
      const tagBodySize = 256;
      const id3Header = createID3v2Header(tagBodySize);
      const tagBody = Buffer.alloc(tagBodySize, 0);
      const frame = createMp3Frame();
      const buffer = Buffer.concat([id3Header, tagBody, frame, Buffer.alloc(100, 0)]);

      const duration = getMp3Duration(buffer);
      expect(duration).toBe(26);
    });

    test('skips ID3v1 TAG in the middle of the stream', () => {
      const frame1 = createMp3Frame();
      // ID3v1 tag: starts with "TAG" (0x54, 0x41, 0x47), 128 bytes total
      const id3v1 = Buffer.alloc(128, 0);
      id3v1[0] = 0x54; // T
      id3v1[1] = 0x41; // A
      id3v1[2] = 0x47; // G
      const frame2 = createMp3Frame();
      const buffer = Buffer.concat([frame1, id3v1, frame2, Buffer.alloc(100, 0)]);

      const duration = getMp3Duration(buffer);
      // 2 frames: 2 * 1152 / 44100 * 1000 = 52.24... → 52ms
      expect(duration).toBe(52);
    });
  });

  describe('Corrupt data handling', () => {
    test('skips garbage bytes between valid frames', () => {
      const frame1 = createMp3Frame();
      const garbage = Buffer.alloc(5, 0x42); // some non-frame bytes
      const frame2 = createMp3Frame();
      const buffer = Buffer.concat([frame1, garbage, frame2, Buffer.alloc(100, 0)]);

      const duration = getMp3Duration(buffer);
      // Should find both frames
      expect(duration).toBe(52);
    });

    test('returns undefined when buffer has only garbage', () => {
      // No valid sync bits anywhere
      const buffer = Buffer.alloc(500, 0x42);
      expect(getMp3Duration(buffer)).toBeUndefined();
    });
  });
});
