#!/usr/bin/env ts-node
/**
 * List all available Google Cloud TTS voices for German
 */

import * as fs from 'fs';
import * as path from 'path';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Simple .env parser
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('.env file loaded from root.');
    }
  } catch {
    // Ignore env loading errors
  }
}

loadEnv();

async function listVoices() {
  console.log('=== Google Cloud TTS Voice List ===');
  console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('Project:', process.env.GOOGLE_CLOUD_PROJECT);
  console.log('');

  try {
    const client = new TextToSpeechClient({
      apiEndpoint: 'eu-texttospeech.googleapis.com',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });

    // Get language from command line or default to de-DE
    const lang = process.argv[2] || 'de-DE';
    console.log(`Fetching voices for ${lang}...\n`);

    const [result] = await client.listVoices({ languageCode: lang });

    console.log(`Total voices: ${result.voices?.length || 0}\n`);

    // Group voices by type
    const groups: Record<string, Array<{name: string; gender: unknown}>> = {
      Neural2: [],
      Wavenet: [],
      Standard: [],
      Studio: [],
      Journey: [],
      Chirp: [],
      Other: [],
    };

    for (const voice of result.voices || []) {
      const name = voice.name || '';
      const gender = voice.ssmlGender || 'UNKNOWN';

      if (name.includes('Neural2')) groups.Neural2.push({ name, gender });
      else if (name.includes('Wavenet')) groups.Wavenet.push({ name, gender });
      else if (name.includes('Standard')) groups.Standard.push({ name, gender });
      else if (name.includes('Studio')) groups.Studio.push({ name, gender });
      else if (name.includes('Journey')) groups.Journey.push({ name, gender });
      else if (name.includes('Chirp')) groups.Chirp.push({ name, gender });
      else groups.Other.push({ name, gender });
    }

    // Print each group
    for (const [type, voices] of Object.entries(groups)) {
      if (voices.length > 0) {
        console.log(`=== ${type} (${voices.length}) ===`);
        voices.forEach(v => console.log(`  ${v.name} - ${v.gender}`));
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

listVoices();
