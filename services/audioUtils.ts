import { Blob } from '@google/genai';

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: uint8ArrayToBase64(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const getApiKey = (): string | undefined => {
  // 1. Check for standard public prefixes (Next.js / Vite / Create React App)
  // Bundlers replace these strings at build time.
  try {
    if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
  } catch (e) {}

  try {
    if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
  } catch (e) {}

  try {
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  } catch (e) {}

  // 2. Check for standard API_KEY (Node.js or specialized setups)
  try {
    if (process.env.API_KEY) return process.env.API_KEY;
  } catch (e) {}

  // 3. Fallback for Vite if not caught above
  try {
    // @ts-ignore
    if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
  } catch (e) {}

  // 4. Global Fallback (last resort for manual script injection)
  if ((window as any).API_KEY) return (window as any).API_KEY;
  
  return undefined;
};