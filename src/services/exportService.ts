import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Renders HTML to a PDF and opens the share sheet.
 *
 * `Print.printToFileAsync` writes into a location that both expo-file-system
 * and expo-sharing refuse to read on Android ("Missing 'READ' permission").
 * Taking the PDF as base64 and writing it ourselves into the cache root — a
 * path both modules allow — avoids that entirely.
 */
export async function sharePdfFromHtml(html: string, fileName = 'laporan.pdf'): Promise<void> {
  const { base64 } = await Print.printToFileAsync({ html, base64: true });
  const dest = new File(Paths.cache, fileName);
  if (dest.exists) dest.delete();
  dest.create();
  dest.write(base64ToBytes(base64 ?? ''));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf', dialogTitle: 'Bagikan PDF' });
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let bits = 0;
  let acc = 0;
  let i = 0;
  for (const ch of clean) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) out[i++] = (acc >> (bits - 8)) & 0xff;
    bits &= 7;
  }
  return out.subarray(0, i);
}
