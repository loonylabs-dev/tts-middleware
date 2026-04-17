/**
 * TTS Request Logger
 *
 * Provider-agnostic request/response logger that writes one Markdown file per
 * upstream API call (e.g. per Google Vertex AI generateContent invocation).
 *
 * Activated via the `DEBUG_TTS_REQUESTS` environment variable. When disabled,
 * `writeRequestLog()` is a no-op so instrumentation adds zero cost.
 *
 * Files are written to `<cwd>/logs/tts/requests/` (override via
 * `TTS_REQUEST_LOG_DIR`). Filename pattern:
 *   `{ISO_TIMESTAMP}_{provider}_{kind}[_{suffix}].md`
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Kind of upstream call being logged.
 *
 * - `dialog-segment` — one segment of a multi-speaker dialog synthesis
 * - `single-synthesize` — a single-speaker synthesis
 * - `other` — anything else a provider wants to log
 */
export type TTSRequestLogKind = 'dialog-segment' | 'single-synthesize' | 'other';

/**
 * Context describing a single upstream TTS API call.
 *
 * Providers populate this before the network call (request side) and, after the
 * call completes, fill in the response-side fields. The logger then serialises
 * the whole entry to a Markdown file.
 */
export interface TTSRequestLogEntry {
  /** Provider identifier, e.g. `vertex-ai` */
  provider: string;
  /** What kind of call this is */
  kind: TTSRequestLogKind;
  /** ISO 8601 timestamp when the request was issued */
  timestamp: string;

  /** Model / deployment / variant being called, when known */
  model?: string;
  /** Region / datacenter, when known */
  region?: string;
  /** Full endpoint URL the request was sent to */
  endpointUrl?: string;
  /** HTTP method (default implied: POST) */
  httpMethod?: string;

  /** Dialog segment index (only for `dialog-segment`) */
  segmentIndex?: number;
  /**
   * Speaker → voice mapping actually used for this specific call (after filtering
   * to speakers that appear in the segment's turns).
   */
  speakers?: Array<{ speaker: string; voice: string }>;
  /**
   * Shape of the request body (provider-specific). For Vertex AI dialog:
   * `single-voice` or `multi-speaker`.
   */
  requestShape?: string;

  /** The final request body that was serialised and sent upstream */
  requestBody: unknown;

  /** HTTP status code (populated after the call) */
  httpStatus?: number;
  /**
   * Response body. On success store lightweight metadata (audio size, mime type,
   * durations). On error store the full error payload for debugging.
   */
  responseBody?: unknown;

  /** Total duration of the upstream call in milliseconds */
  durationMs?: number;

  /** Set when the call failed */
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };

  /** Free-form extra fields the caller wants to record */
  extras?: Record<string, unknown>;
}

/**
 * Check whether request logging is enabled via the `DEBUG_TTS_REQUESTS` env var.
 *
 * Truthy values: `1`, `true`, `yes`, `on` (case-insensitive). Anything else is
 * treated as disabled.
 */
export function isRequestLoggingEnabled(): boolean {
  const raw = process.env.DEBUG_TTS_REQUESTS;
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/**
 * Resolve the directory where log files are written.
 *
 * Override via `TTS_REQUEST_LOG_DIR`. Defaults to `<cwd>/logs/tts/requests`.
 */
function resolveLogDir(): string {
  const override = process.env.TTS_REQUEST_LOG_DIR;
  if (override && override.trim().length > 0) {
    return resolve(override.trim());
  }
  return resolve(process.cwd(), 'logs', 'tts', 'requests');
}

/**
 * Make a string safe to embed in a filename across Windows/macOS/Linux.
 * Replaces reserved characters with `-` and collapses repeats.
 */
function sanitiseForFilename(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Build the filename for a log entry.
 *
 * Pattern: `{ISO}_{provider}_{kind}[_{suffix}].md` where `ISO` has colons and
 * dots replaced so it works on Windows.
 */
function buildFilename(entry: TTSRequestLogEntry): string {
  const isoSafe = entry.timestamp.replace(/[:.]/g, '-');
  const parts = [isoSafe, sanitiseForFilename(entry.provider), sanitiseForFilename(entry.kind)];

  if (entry.kind === 'dialog-segment' && typeof entry.segmentIndex === 'number') {
    parts.push(`seg${entry.segmentIndex}`);
  }
  if (entry.requestShape) {
    parts.push(sanitiseForFilename(entry.requestShape));
  }

  return `${parts.join('_')}.md`;
}

/**
 * Serialise unknown data to a fenced JSON code block.
 *
 * Handles circular references and BigInts without throwing; text content is
 * written verbatim (no truncation) so the full upstream payload is preserved.
 */
function toJsonBlock(label: string, data: unknown): string {
  let json: string;
  try {
    json = JSON.stringify(
      data,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    );
  } catch (err) {
    json = `/* Failed to stringify ${label}: ${(err as Error).message} */`;
  }
  return ['```json', json, '```'].join('\n');
}

/**
 * Render a log entry to Markdown. The output includes every field that is
 * populated; no truncation is performed.
 */
function renderMarkdown(entry: TTSRequestLogEntry): string {
  const lines: string[] = [];

  lines.push(`# TTS Request Log — ${entry.provider} / ${entry.kind}`);
  lines.push('');
  lines.push('## Meta');
  lines.push(`- **Timestamp**: ${entry.timestamp}`);
  lines.push(`- **Provider**: ${entry.provider}`);
  lines.push(`- **Kind**: ${entry.kind}`);
  if (entry.model) lines.push(`- **Model**: ${entry.model}`);
  if (entry.region) lines.push(`- **Region**: ${entry.region}`);
  if (entry.endpointUrl) lines.push(`- **Endpoint**: ${entry.endpointUrl}`);
  if (entry.httpMethod) lines.push(`- **HTTP Method**: ${entry.httpMethod}`);
  if (typeof entry.durationMs === 'number') {
    lines.push(`- **Duration**: ${entry.durationMs} ms`);
  }
  if (typeof entry.httpStatus === 'number') {
    lines.push(`- **HTTP Status**: ${entry.httpStatus}`);
  }
  lines.push('');

  if (
    typeof entry.segmentIndex === 'number' ||
    entry.requestShape ||
    (entry.speakers && entry.speakers.length > 0)
  ) {
    lines.push('## Dialog Context');
    if (typeof entry.segmentIndex === 'number') {
      lines.push(`- **Segment Index**: ${entry.segmentIndex}`);
    }
    if (entry.requestShape) {
      lines.push(`- **Request Shape**: ${entry.requestShape}`);
    }
    if (entry.speakers && entry.speakers.length > 0) {
      lines.push(`- **Speaker Count**: ${entry.speakers.length}`);
      lines.push('- **Speaker → Voice**:');
      for (const s of entry.speakers) {
        lines.push(`  - \`${s.speaker}\` → \`${s.voice}\``);
      }
    }
    lines.push('');
  }

  lines.push('## Request Body');
  lines.push(toJsonBlock('requestBody', entry.requestBody));
  lines.push('');

  if (entry.responseBody !== undefined) {
    lines.push('## Response');
    lines.push(toJsonBlock('responseBody', entry.responseBody));
    lines.push('');
  }

  if (entry.error) {
    lines.push('## Error');
    if (entry.error.name) lines.push(`- **Name**: ${entry.error.name}`);
    lines.push(`- **Message**: ${entry.error.message}`);
    if (entry.error.stack) {
      lines.push('');
      lines.push('```');
      lines.push(entry.error.stack);
      lines.push('```');
    }
    lines.push('');
  }

  if (entry.extras && Object.keys(entry.extras).length > 0) {
    lines.push('## Extras');
    lines.push(toJsonBlock('extras', entry.extras));
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated on ${new Date().toISOString()}*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Write a request log entry as Markdown.
 *
 * No-op when `DEBUG_TTS_REQUESTS` is not enabled. Never throws — logging failures
 * must not break TTS synthesis. Errors are reported on stderr for visibility.
 *
 * @returns The absolute file path of the written log, or `null` when disabled
 *   or the write failed.
 */
export function writeRequestLog(entry: TTSRequestLogEntry): string | null {
  if (!isRequestLoggingEnabled()) return null;

  try {
    const dir = resolveLogDir();
    mkdirSync(dir, { recursive: true });
    const filename = buildFilename(entry);
    const fullPath = join(dir, filename);
    writeFileSync(fullPath, renderMarkdown(entry), 'utf8');
    return fullPath;
  } catch (err) {
    // Never let logging break the main flow.
    // eslint-disable-next-line no-console
    console.error('[tts-request-logger] Failed to write log:', (err as Error).message);
    return null;
  }
}
