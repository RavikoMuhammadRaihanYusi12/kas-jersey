import { base64ToBytes } from '@/services/exportService';

// Known vectors: "hello" / "hello world" and a PDF magic header.
describe('base64ToBytes', () => {
  it('decodes a simple ASCII string', () => {
    expect(Array.from(base64ToBytes('aGVsbG8='))).toEqual([104, 101, 108, 108, 111]);
  });

  it('decodes the PDF magic header', () => {
    // "%PDF-1.4"
    expect(Array.from(base64ToBytes('JVBERi0xLjQ='))).toEqual([37, 80, 68, 70, 45, 49, 46, 52]);
  });

  it('decodes a full 3-byte group without padding', () => {
    expect(Array.from(base64ToBytes('YWJj'))).toEqual([97, 98, 99]);
  });

  it('handles all 256 byte values', () => {
    const bytes = Array.from({ length: 256 }, (_, i) => i);
    expect(Array.from(base64ToBytes(encode(bytes)))).toEqual(bytes);
  });

  it('ignores whitespace and newlines', () => {
    expect(Array.from(base64ToBytes('aGVs\n bG8='))).toEqual([104, 101, 108, 108, 111]);
  });
});

/** Reference encoder used only by the round-trip checks above. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const n = bytes.length - i;
    out += B64[(chunk >> 18) & 63] + B64[(chunk >> 12) & 63];
    out += n > 1 ? B64[(chunk >> 6) & 63] : '=';
    out += n > 2 ? B64[chunk & 63] : '=';
  }
  return out;
}
