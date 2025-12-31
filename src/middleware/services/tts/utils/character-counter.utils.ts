/**
 * Character Counting Utilities
 *
 * @description Accurate character counting for billing purposes.
 * This is billing-critical code - all functions must be 100% accurate
 * and match provider billing methodologies.
 *
 * @critical This code directly impacts customer billing. Any bugs here
 * could result in incorrect charges. Test coverage MUST be 100%.
 */

/**
 * Count all characters in text for billing purposes
 *
 * @param text - The input text to count
 * @returns The total number of characters including spaces, punctuation, and newlines
 *
 * @description
 * This function counts ALL characters in the input text:
 * - Letters (a-z, A-Z)
 * - Numbers (0-9)
 * - Spaces and tabs
 * - Newlines (\n, \r\n)
 * - Punctuation and special characters
 * - Unicode characters (counted as 1 character each)
 * - Emoji (counted as 1 character each, regardless of byte length)
 *
 * @example
 * ```typescript
 * countCharacters("Hello World!") // returns 12
 * countCharacters("Guten Morgen")  // returns 12
 * countCharacters("Hello 👋")      // returns 8
 * countCharacters("")              // returns 0
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length
 *
 * @critical Billing-critical function. Must be 100% accurate.
 */
export function countCharacters(text: string): number {
  // JavaScript string length counts UTF-16 code units
  // For most characters this equals 1, which matches provider billing
  return text.length;
}

/**
 * Count characters in text after removing SSML markup
 *
 * @param text - The input text (may contain SSML tags)
 * @returns The number of characters excluding SSML tags
 *
 * @description
 * This function removes all SSML (Speech Synthesis Markup Language) tags
 * before counting characters. This is used when the middleware generates
 * SSML internally but billing is based on the plain text content.
 *
 * SSML tags removed include:
 * - `<speak>`, `</speak>` - Root element
 * - `<voice>`, `</voice>` - Voice selection
 * - `<prosody>`, `</prosody>` - Prosody (rate, pitch, volume)
 * - `<emphasis>`, `</emphasis>` - Emphasis
 * - `<break>` - Pauses
 * - `<say-as>`, `</say-as>` - Interpret-as hints
 * - `<phoneme>`, `</phoneme>` - Phonetic pronunciation
 * - `<sub>`, `</sub>` - Substitution
 * - `<lang>`, `</lang>` - Language switching
 * - And all other SSML tags
 *
 * @example
 * ```typescript
 * countCharactersWithoutSSML("<speak>Hello</speak>")
 * // returns 5 (only "Hello" is counted)
 *
 * countCharactersWithoutSSML('<voice name="en-US-Jenny">Text</voice>')
 * // returns 4 (only "Text" is counted)
 *
 * countCharactersWithoutSSML('<prosody rate="slow">Hello World</prosody>')
 * // returns 11 (only "Hello World" is counted)
 * ```
 *
 * @critical Billing-critical function. Must match Azure's character counting.
 */
export function countCharactersWithoutSSML(text: string): number {
  // Remove all SSML tags (opening and closing tags, including self-closing)
  // Pattern: <tag> or </tag> or <tag attr="value"> or <tag/>
  const withoutSSML = text.replace(/<[^>]+>/g, '');

  // Count the remaining characters
  return withoutSSML.length;
}

/**
 * Validate that character count matches expected range
 *
 * @param text - The input text
 * @param minChars - Minimum expected characters (default: 0)
 * @param maxChars - Maximum expected characters (default: Infinity)
 * @returns True if count is within range
 * @throws {RangeError} If character count is outside expected range
 *
 * @description
 * This is a utility function to validate text length before synthesis.
 * Providers often have limits on input text length (e.g., Azure: 3000 chars per request).
 *
 * @example
 * ```typescript
 * validateCharacterCount("Hello", 1, 100) // returns true
 * validateCharacterCount("", 1, 100)       // throws RangeError
 * ```
 */
export function validateCharacterCount(
  text: string,
  minChars: number = 0,
  maxChars: number = Infinity
): boolean {
  const count = countCharacters(text);

  if (count < minChars) {
    throw new RangeError(
      `Text must have at least ${minChars} characters (got ${count})`
    );
  }

  if (count > maxChars) {
    throw new RangeError(
      `Text must have at most ${maxChars} characters (got ${count})`
    );
  }

  return true;
}

/**
 * Count billable characters (alias for countCharacters)
 *
 * @param text - The input text
 * @returns The number of billable characters
 *
 * @description
 * Semantic alias for countCharacters to make billing calculations clearer.
 * This is the function consumers should use when calculating costs.
 *
 * @example
 * ```typescript
 * const text = "Hello World!";
 * const chars = countBillableCharacters(text); // 12
 * const costUSD = (chars / 1_000_000) * 16; // $16 per 1M chars
 * ```
 */
export function countBillableCharacters(text: string): number {
  return countCharacters(text);
}

/**
 * Estimate audio duration based on character count
 *
 * @param text - The input text
 * @param speedMultiplier - Speech speed (0.5 to 2.0, default: 1.0)
 * @param charsPerSecond - Average characters spoken per second (default: 15)
 * @returns Estimated duration in milliseconds
 *
 * @description
 * Provides a rough estimate of audio duration based on character count.
 * This is NOT exact and varies by:
 * - Language (some languages are more verbose)
 * - Voice (different voices have different pacing)
 * - Content (technical terms take longer)
 * - Speed setting
 *
 * Default assumption: ~15 characters per second at normal speed
 * (roughly 150-180 words per minute, assuming 5-6 chars per word)
 *
 * @example
 * ```typescript
 * estimateAudioDuration("Hello World!", 1.0) // ~800ms
 * estimateAudioDuration("Hello World!", 0.5) // ~1600ms (slower)
 * ```
 */
export function estimateAudioDuration(
  text: string,
  speedMultiplier: number = 1.0,
  charsPerSecond: number = 15
): number {
  const charCount = countCharacters(text);

  // Calculate seconds at normal speed
  const secondsAtNormalSpeed = charCount / charsPerSecond;

  // Adjust for speed multiplier (higher speed = shorter duration)
  const adjustedSeconds = secondsAtNormalSpeed / speedMultiplier;

  // Convert to milliseconds
  return Math.round(adjustedSeconds * 1000);
}

/**
 * Format character count for display
 *
 * @param count - The character count
 * @returns Formatted string (e.g., "1.2K chars", "1.5M chars")
 *
 * @description
 * Formats large character counts in human-readable format.
 * Useful for displaying usage statistics.
 *
 * @example
 * ```typescript
 * formatCharacterCount(500)         // "500 chars"
 * formatCharacterCount(1234)        // "1.2K chars"
 * formatCharacterCount(1500000)     // "1.5M chars"
 * ```
 */
export function formatCharacterCount(count: number): string {
  if (count < 1000) {
    return `${count} chars`;
  }

  if (count < 1_000_000) {
    return `${(count / 1000).toFixed(1)}K chars`;
  }

  return `${(count / 1_000_000).toFixed(1)}M chars`;
}
