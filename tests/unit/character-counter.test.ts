/**
 * Tests for Character Counter Utilities
 *
 * @description Tests character counting functions (billing-critical)
 * @coverage Target: 100% (billing-critical code)
 */

import {
  countCharacters,
  countCharactersWithoutSSML,
  validateCharacterCount,
  countBillableCharacters,
  estimateAudioDuration,
  formatCharacterCount,
} from '../../src/middleware/services/tts/utils/character-counter.utils';

describe('countCharacters', () => {
  describe('Basic text', () => {
    test('counts simple text correctly', () => {
      expect(countCharacters('Hello World')).toBe(11);
    });

    test('counts text with punctuation', () => {
      expect(countCharacters('Hello, World!')).toBe(13);
    });

    test('counts text with numbers', () => {
      expect(countCharacters('abc123')).toBe(6);
    });

    test('handles empty string', () => {
      expect(countCharacters('')).toBe(0);
    });

    test('handles single character', () => {
      expect(countCharacters('a')).toBe(1);
    });
  });

  describe('Whitespace handling', () => {
    test('includes spaces in count', () => {
      expect(countCharacters('a b c')).toBe(5);
    });

    test('includes multiple consecutive spaces', () => {
      expect(countCharacters('a  b  c')).toBe(7);
    });

    test('includes tabs in count', () => {
      expect(countCharacters('a\tb')).toBe(3);
    });

    test('includes newlines in count', () => {
      expect(countCharacters('a\nb')).toBe(3);
    });

    test('includes carriage returns in count', () => {
      expect(countCharacters('a\r\nb')).toBe(4);
    });

    test('counts string with only whitespace', () => {
      expect(countCharacters('   ')).toBe(3);
      expect(countCharacters('\t\t')).toBe(2);
      expect(countCharacters('\n\n\n')).toBe(3);
    });
  });

  describe('Unicode and special characters', () => {
    test('counts accented characters as 1 char each', () => {
      expect(countCharacters('Café')).toBe(4);
      expect(countCharacters('naïve')).toBe(5);
    });

    test('counts German umlauts correctly', () => {
      expect(countCharacters('Ä ö ü ß')).toBe(7);
      expect(countCharacters('Guten Morgen')).toBe(12);
    });

    test('counts CJK characters correctly', () => {
      expect(countCharacters('日本語')).toBe(3);
      expect(countCharacters('中文')).toBe(2);
      expect(countCharacters('한국어')).toBe(3);
    });

    test('counts emoji correctly', () => {
      expect(countCharacters('Hello 👋')).toBe(8);
      expect(countCharacters('🎉')).toBe(2); // Some emoji are 2 code units
      expect(countCharacters('😀😁😂')).toBe(6); // 2 units each
    });

    test('counts mathematical symbols', () => {
      expect(countCharacters('2 + 2 = 4')).toBe(9);
      expect(countCharacters('∑∫∂')).toBe(3);
    });

    test('counts currency symbols', () => {
      expect(countCharacters('$100')).toBe(4);
      expect(countCharacters('€50')).toBe(3);
      expect(countCharacters('¥1000')).toBe(5);
    });
  });

  describe('Long text', () => {
    test('counts multiline text correctly', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      expect(countCharacters(text)).toBe(20);
    });

    test('counts paragraph with various punctuation', () => {
      const text =
        "Guten Morgen, wie geht es dir? Ich hoffe, es geht dir gut!";
      expect(countCharacters(text)).toBe(58);
    });

    test('counts very long text', () => {
      const text = 'a'.repeat(10000);
      expect(countCharacters(text)).toBe(10000);
    });
  });
});

describe('countCharactersWithoutSSML', () => {
  describe('SSML tag removal', () => {
    test('removes simple speak tags', () => {
      expect(countCharactersWithoutSSML('<speak>Hello</speak>')).toBe(5);
    });

    test('removes voice tags', () => {
      expect(
        countCharactersWithoutSSML('<voice name="en-US-Jenny">Text</voice>')
      ).toBe(4);
    });

    test('removes prosody tags', () => {
      expect(
        countCharactersWithoutSSML('<prosody rate="slow">Hello World</prosody>')
      ).toBe(11);
    });

    test('removes break tags (self-closing)', () => {
      expect(countCharactersWithoutSSML('Hello<break time="1s"/>World')).toBe(
        10
      );
    });

    test('removes emphasis tags', () => {
      expect(
        countCharactersWithoutSSML('<emphasis level="strong">Important</emphasis>')
      ).toBe(9);
    });

    test('removes say-as tags', () => {
      expect(
        countCharactersWithoutSSML(
          '<say-as interpret-as="date">2024-01-01</say-as>'
        )
      ).toBe(10);
    });

    test('removes phoneme tags', () => {
      expect(
        countCharactersWithoutSSML('<phoneme alphabet="ipa">həˈloʊ</phoneme>')
      ).toBe(6);
    });

    test('removes sub tags', () => {
      expect(
        countCharactersWithoutSSML('<sub alias="World Wide Web">WWW</sub>')
      ).toBe(3);
    });

    test('removes lang tags', () => {
      expect(
        countCharactersWithoutSSML('<lang xml:lang="de-DE">Guten Tag</lang>')
      ).toBe(9);
    });
  });

  describe('Nested SSML tags', () => {
    test('removes nested tags', () => {
      const ssml =
        '<speak><voice name="en-US-Jenny"><prosody rate="slow">Hello</prosody></voice></speak>';
      expect(countCharactersWithoutSSML(ssml)).toBe(5);
    });

    test('handles multiple nested levels', () => {
      const ssml =
        '<speak><voice name="test"><prosody rate="1.0"><emphasis>Text</emphasis></prosody></voice></speak>';
      expect(countCharactersWithoutSSML(ssml)).toBe(4);
    });

    test('handles tags with complex attributes', () => {
      const ssml = `<voice xml:lang='de-DE' name='de-DE-KatjaNeural'><prosody rate='1.2' pitch='+2st'>Guten Morgen</prosody></voice>`;
      expect(countCharactersWithoutSSML(ssml)).toBe(12);
    });
  });

  describe('Mixed content', () => {
    test('counts text before and after tags', () => {
      expect(
        countCharactersWithoutSSML('Hello <emphasis>World</emphasis>!')
      ).toBe(12);
    });

    test('handles multiple tags in sequence', () => {
      expect(
        countCharactersWithoutSSML('<speak>A</speak><speak>B</speak>')
      ).toBe(2);
    });

    test('preserves spaces between tags', () => {
      expect(
        countCharactersWithoutSSML('<speak>Hello</speak> <speak>World</speak>')
      ).toBe(11);
    });
  });

  describe('Edge cases', () => {
    test('handles empty string', () => {
      expect(countCharactersWithoutSSML('')).toBe(0);
    });

    test('handles string with only tags (no text)', () => {
      expect(countCharactersWithoutSSML('<speak></speak>')).toBe(0);
    });

    test('handles string with no SSML tags', () => {
      expect(countCharactersWithoutSSML('Plain text')).toBe(10);
    });

    test('handles tags with single quotes in attributes', () => {
      expect(
        countCharactersWithoutSSML(`<voice name='en-US-Jenny'>Hello</voice>`)
      ).toBe(5);
    });

    test('handles tags with double quotes in attributes', () => {
      expect(
        countCharactersWithoutSSML(`<voice name="en-US-Jenny">Hello</voice>`)
      ).toBe(5);
    });

    test('handles unclosed tags gracefully', () => {
      // Regex removes anything that looks like a tag
      expect(countCharactersWithoutSSML('<speak>Hello')).toBe(5);
    });
  });

  describe('Real-world examples', () => {
    test('Azure SSML example 1', () => {
      const ssml = `<speak version='1.0' xml:lang='de-DE'>
        <voice xml:lang='de-DE' name='de-DE-KatjaNeural'>
          <prosody rate='1.0'>Guten Morgen</prosody>
        </voice>
      </speak>`;
      expect(countCharactersWithoutSSML(ssml)).toBe(48); // "Guten Morgen" + whitespace/newlines
    });

    test('Azure SSML example 2 with emotion', () => {
      const ssml = `<speak version='1.0' xml:lang='en-US'>
        <voice name='en-US-JennyNeural'>
          <mstts:express-as style='cheerful'>
            Hello, how are you?
          </mstts:express-as>
        </voice>
      </speak>`;
      // Count includes the text and whitespace
      const result = countCharactersWithoutSSML(ssml);
      expect(result).toBeGreaterThan(0);
    });
  });
});

describe('validateCharacterCount', () => {
  test('returns true for valid count', () => {
    expect(validateCharacterCount('Hello', 1, 100)).toBe(true);
  });

  test('returns true when exactly at minimum', () => {
    expect(validateCharacterCount('Hello', 5, 100)).toBe(true);
  });

  test('returns true when exactly at maximum', () => {
    expect(validateCharacterCount('Hello', 1, 5)).toBe(true);
  });

  test('throws RangeError when below minimum', () => {
    expect(() => validateCharacterCount('Hi', 5, 100)).toThrow(RangeError);
    expect(() => validateCharacterCount('Hi', 5, 100)).toThrow(
      'at least 5 characters'
    );
  });

  test('throws RangeError when above maximum', () => {
    expect(() => validateCharacterCount('Hello World', 1, 5)).toThrow(
      RangeError
    );
    expect(() => validateCharacterCount('Hello World', 1, 5)).toThrow(
      'at most 5 characters'
    );
  });

  test('uses default minimum of 0', () => {
    expect(validateCharacterCount('')).toBe(true);
  });

  test('uses default maximum of Infinity', () => {
    const longText = 'a'.repeat(1000000);
    expect(validateCharacterCount(longText)).toBe(true);
  });

  test('throws with empty string when minimum > 0', () => {
    expect(() => validateCharacterCount('', 1)).toThrow(RangeError);
  });
});

describe('countBillableCharacters', () => {
  test('is an alias for countCharacters', () => {
    const text = 'Hello World!';
    expect(countBillableCharacters(text)).toBe(countCharacters(text));
    expect(countBillableCharacters(text)).toBe(12);
  });

  test('handles all the same cases as countCharacters', () => {
    expect(countBillableCharacters('')).toBe(0);
    expect(countBillableCharacters('Café')).toBe(4);
    expect(countBillableCharacters('Hello 👋')).toBe(8);
  });
});

describe('estimateAudioDuration', () => {
  test('estimates duration for simple text at normal speed', () => {
    // 15 chars/sec default: 12 chars / 15 = 0.8 sec = 800ms
    expect(estimateAudioDuration('Hello World!')).toBe(800);
  });

  test('estimates longer duration for slower speech', () => {
    // At 0.5 speed (50% slower), duration doubles
    const normalDuration = estimateAudioDuration('Hello World!', 1.0);
    const slowDuration = estimateAudioDuration('Hello World!', 0.5);
    expect(slowDuration).toBe(normalDuration * 2);
  });

  test('estimates shorter duration for faster speech', () => {
    // At 2.0 speed (2x faster), duration halves
    const normalDuration = estimateAudioDuration('Hello World!', 1.0);
    const fastDuration = estimateAudioDuration('Hello World!', 2.0);
    expect(fastDuration).toBe(normalDuration / 2);
  });

  test('returns 0 for empty string', () => {
    expect(estimateAudioDuration('')).toBe(0);
  });

  test('uses custom chars per second rate', () => {
    // 12 chars at 10 chars/sec = 1.2 sec = 1200ms
    expect(estimateAudioDuration('Hello World!', 1.0, 10)).toBe(1200);
  });

  test('handles long text', () => {
    const text = 'a'.repeat(150); // 150 chars at 15 chars/sec = 10 sec
    expect(estimateAudioDuration(text)).toBe(10000);
  });

  test('rounds to nearest millisecond', () => {
    // Should return integer milliseconds
    const duration = estimateAudioDuration('Hello');
    expect(Number.isInteger(duration)).toBe(true);
  });
});

describe('formatCharacterCount', () => {
  test('formats small counts as plain numbers', () => {
    expect(formatCharacterCount(0)).toBe('0 chars');
    expect(formatCharacterCount(500)).toBe('500 chars');
    expect(formatCharacterCount(999)).toBe('999 chars');
  });

  test('formats thousands with K suffix', () => {
    expect(formatCharacterCount(1000)).toBe('1.0K chars');
    expect(formatCharacterCount(1234)).toBe('1.2K chars');
    expect(formatCharacterCount(5678)).toBe('5.7K chars');
    expect(formatCharacterCount(999999)).toBe('1000.0K chars');
  });

  test('formats millions with M suffix', () => {
    expect(formatCharacterCount(1000000)).toBe('1.0M chars');
    expect(formatCharacterCount(1500000)).toBe('1.5M chars');
    expect(formatCharacterCount(2345678)).toBe('2.3M chars');
  });

  test('rounds to 1 decimal place', () => {
    expect(formatCharacterCount(1234)).toBe('1.2K chars');
    expect(formatCharacterCount(1267)).toBe('1.3K chars');
  });

  test('handles very large numbers', () => {
    expect(formatCharacterCount(100000000)).toBe('100.0M chars');
  });
});

describe('Integration: Billing scenarios', () => {
  test('Azure billing calculation example', () => {
    const text = 'Guten Morgen, wie geht es dir?';
    const chars = countBillableCharacters(text);
    const costPerMillionChars = 16; // $16 per 1M chars
    const costUSD = (chars / 1_000_000) * costPerMillionChars;

    expect(chars).toBe(30);
    expect(costUSD).toBeCloseTo(0.00048);
  });

  test('SSML billing calculation (characters without markup)', () => {
    const ssml = `<speak><voice name="en-US-Jenny"><prosody rate="slow">Hello World</prosody></voice></speak>`;
    const billableChars = countCharactersWithoutSSML(ssml);

    expect(billableChars).toBe(11); // Only "Hello World" is billable
  });

  test('Large batch billing', () => {
    const texts = [
      'Hello',
      'Guten Tag',
      'Bonjour',
      'Hola',
      'Ciao',
    ];

    const totalChars = texts.reduce(
      (sum, text) => sum + countBillableCharacters(text),
      0
    );

    expect(totalChars).toBe(29);
    expect(formatCharacterCount(totalChars)).toBe('29 chars');
  });
});
