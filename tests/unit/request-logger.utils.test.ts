/**
 * Tests for Request Logger Utility
 *
 * @description Covers env-var gating, filesystem writes, filename generation,
 * Markdown rendering for all entry variants (success, error, dialog context,
 * extras), and robustness to circular references / BigInts.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  writeRequestLog,
  isRequestLoggingEnabled,
  type TTSRequestLogEntry,
} from '../../src/middleware/services/tts/utils/request-logger.utils';

describe('Request Logger Utils', () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tts-req-log-'));
    process.env.DEBUG_TTS_REQUESTS = 'true';
    process.env.TTS_REQUEST_LOG_DIR = tempDir;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const makeEntry = (overrides: Partial<TTSRequestLogEntry> = {}): TTSRequestLogEntry => ({
    provider: 'vertex-ai',
    kind: 'dialog-segment',
    timestamp: '2026-04-17T12:34:56.789Z',
    model: 'gemini-3.1-flash-tts-preview',
    region: 'us-central1',
    endpointUrl: 'https://us-central1-aiplatform.googleapis.com/v1/...',
    httpMethod: 'POST',
    segmentIndex: 0,
    speakers: [
      { speaker: 'Alice', voice: 'Aoede' },
      { speaker: 'Bob', voice: 'Puck' },
    ],
    requestShape: 'multi-speaker',
    requestBody: { contents: [{ role: 'user', parts: [{ text: 'Alice: hi\nBob: hello' }] }] },
    httpStatus: 200,
    responseBody: { mimeType: 'audio/pcm', audioBytes: 12345 },
    durationMs: 432,
    extras: { turnCount: 2, hasStylePrompt: false },
    ...overrides,
  });

  describe('isRequestLoggingEnabled', () => {
    it('returns false when env var is unset', () => {
      delete process.env.DEBUG_TTS_REQUESTS;
      expect(isRequestLoggingEnabled()).toBe(false);
    });

    it.each(['true', 'TRUE', '1', 'yes', 'YES', 'on', 'ON', '  true  '])(
      'returns true for truthy value %p',
      (val) => {
        process.env.DEBUG_TTS_REQUESTS = val;
        expect(isRequestLoggingEnabled()).toBe(true);
      },
    );

    it.each(['false', '0', 'no', 'off', 'random', ''])(
      'returns false for value %p',
      (val) => {
        process.env.DEBUG_TTS_REQUESTS = val;
        expect(isRequestLoggingEnabled()).toBe(false);
      },
    );
  });

  describe('writeRequestLog — gating', () => {
    it('returns null when logging is disabled', () => {
      process.env.DEBUG_TTS_REQUESTS = 'false';
      const result = writeRequestLog(makeEntry());
      expect(result).toBeNull();
      expect(readdirSync(tempDir)).toHaveLength(0);
    });

    it('returns null when env var is missing entirely', () => {
      delete process.env.DEBUG_TTS_REQUESTS;
      expect(writeRequestLog(makeEntry())).toBeNull();
    });
  });

  describe('writeRequestLog — filesystem', () => {
    it('creates log directory recursively if it does not exist', () => {
      const nested = join(tempDir, 'a', 'b', 'c');
      process.env.TTS_REQUEST_LOG_DIR = nested;
      const result = writeRequestLog(makeEntry());
      expect(result).not.toBeNull();
      expect(existsSync(nested)).toBe(true);
      expect(readdirSync(nested)).toHaveLength(1);
    });

    it('falls back to cwd/logs/tts/requests when override is empty', () => {
      process.env.TTS_REQUEST_LOG_DIR = '   ';
      // Redirect cwd to tempDir to avoid polluting the repo
      const origCwd = process.cwd();
      try {
        process.chdir(tempDir);
        const result = writeRequestLog(makeEntry());
        expect(result).not.toBeNull();
        expect(result).toContain(join('logs', 'tts', 'requests'));
      } finally {
        process.chdir(origCwd);
      }
    });

    it('returns null and does not throw when write fails', () => {
      // Point at an invalid path (null byte is rejected by Node fs on all OSes)
      process.env.TTS_REQUEST_LOG_DIR = '\u0000invalid';
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = writeRequestLog(makeEntry());
      expect(result).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  describe('writeRequestLog — filename', () => {
    it('uses ISO timestamp with colons/dots replaced', () => {
      writeRequestLog(makeEntry());
      const [name] = readdirSync(tempDir);
      expect(name.startsWith('2026-04-17T12-34-56-789Z_')).toBe(true);
    });

    it('embeds provider and kind', () => {
      writeRequestLog(makeEntry());
      const [name] = readdirSync(tempDir);
      expect(name).toContain('vertex-ai');
      expect(name).toContain('dialog-segment');
    });

    it('appends seg{N} for dialog-segment kind', () => {
      writeRequestLog(makeEntry({ segmentIndex: 7 }));
      const [name] = readdirSync(tempDir);
      expect(name).toContain('seg7');
    });

    it('omits seg suffix when not dialog-segment', () => {
      writeRequestLog(makeEntry({ kind: 'single-synthesize', segmentIndex: undefined }));
      const [name] = readdirSync(tempDir);
      expect(name).not.toMatch(/_seg\d+/);
    });

    it('appends requestShape when provided', () => {
      writeRequestLog(makeEntry({ requestShape: 'multi-speaker' }));
      const [name] = readdirSync(tempDir);
      expect(name).toContain('multi-speaker');
    });

    it('sanitises illegal filename characters in provider/kind', () => {
      writeRequestLog(
        makeEntry({ provider: 'bad/provider:name*', requestShape: 'a<b>c' }),
      );
      const [name] = readdirSync(tempDir);
      expect(name).not.toMatch(/[<>:"/\\|?*]/);
    });
  });

  describe('writeRequestLog — Markdown content', () => {
    it('includes meta section with all populated fields', () => {
      const fullPath = writeRequestLog(makeEntry())!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('# TTS Request Log — vertex-ai / dialog-segment');
      expect(md).toContain('## Meta');
      expect(md).toContain('- **Timestamp**: 2026-04-17T12:34:56.789Z');
      expect(md).toContain('- **Provider**: vertex-ai');
      expect(md).toContain('- **Kind**: dialog-segment');
      expect(md).toContain('- **Model**: gemini-3.1-flash-tts-preview');
      expect(md).toContain('- **Region**: us-central1');
      expect(md).toContain('- **Endpoint**: https://us-central1-aiplatform');
      expect(md).toContain('- **HTTP Method**: POST');
      expect(md).toContain('- **Duration**: 432 ms');
      expect(md).toContain('- **HTTP Status**: 200');
    });

    it('omits optional meta fields when absent', () => {
      const fullPath = writeRequestLog(
        makeEntry({
          model: undefined,
          region: undefined,
          endpointUrl: undefined,
          httpMethod: undefined,
          durationMs: undefined,
          httpStatus: undefined,
        }),
      )!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).not.toContain('**Model**');
      expect(md).not.toContain('**Region**');
      expect(md).not.toContain('**Endpoint**');
      expect(md).not.toContain('**HTTP Method**');
      expect(md).not.toContain('**Duration**');
      expect(md).not.toContain('**HTTP Status**');
    });

    it('renders dialog context with speaker→voice mapping', () => {
      const fullPath = writeRequestLog(makeEntry())!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('## Dialog Context');
      expect(md).toContain('- **Segment Index**: 0');
      expect(md).toContain('- **Request Shape**: multi-speaker');
      expect(md).toContain('- **Speaker Count**: 2');
      expect(md).toContain('`Alice` → `Aoede`');
      expect(md).toContain('`Bob` → `Puck`');
    });

    it('omits dialog context when no context fields are present', () => {
      const fullPath = writeRequestLog(
        makeEntry({
          kind: 'other',
          segmentIndex: undefined,
          speakers: undefined,
          requestShape: undefined,
        }),
      )!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).not.toContain('## Dialog Context');
    });

    it('serialises the full request body as JSON (no truncation)', () => {
      const bigText = 'x'.repeat(10000);
      const fullPath = writeRequestLog(
        makeEntry({ requestBody: { text: bigText } }),
      )!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('## Request Body');
      expect(md).toContain('```json');
      expect(md).toContain(bigText);
    });

    it('includes response section when responseBody is set', () => {
      const fullPath = writeRequestLog(makeEntry())!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('## Response');
      expect(md).toContain('"mimeType": "audio/pcm"');
      expect(md).toContain('"audioBytes": 12345');
    });

    it('omits response section when responseBody is undefined', () => {
      const fullPath = writeRequestLog(makeEntry({ responseBody: undefined }))!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).not.toContain('## Response');
    });

    it('renders error section including stack and name', () => {
      const fullPath = writeRequestLog(
        makeEntry({
          error: { name: 'FetchError', message: 'connect ECONNREFUSED', stack: 'Error: boom\n    at x' },
        }),
      )!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('## Error');
      expect(md).toContain('- **Name**: FetchError');
      expect(md).toContain('- **Message**: connect ECONNREFUSED');
      expect(md).toContain('Error: boom');
    });

    it('renders error section without stack when stack is missing', () => {
      const fullPath = writeRequestLog(
        makeEntry({ error: { message: 'no stack here' } }),
      )!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('- **Message**: no stack here');
      expect(md).not.toContain('- **Name**:');
    });

    it('includes extras section when provided', () => {
      const fullPath = writeRequestLog(makeEntry())!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('## Extras');
      expect(md).toContain('"turnCount": 2');
    });

    it('omits extras section when empty or missing', () => {
      const fullPath = writeRequestLog(makeEntry({ extras: {} }))!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).not.toContain('## Extras');
    });

    it('handles BigInt values without throwing', () => {
      const fullPath = writeRequestLog(
        makeEntry({ requestBody: { bigNumber: BigInt('12345678901234567890') } }),
      )!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('"12345678901234567890"');
    });

    it('gracefully reports when JSON.stringify fails (circular ref)', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;
      const fullPath = writeRequestLog(makeEntry({ requestBody: circular }))!;
      const md = readFileSync(fullPath, 'utf8');
      expect(md).toContain('Failed to stringify requestBody');
    });
  });
});
