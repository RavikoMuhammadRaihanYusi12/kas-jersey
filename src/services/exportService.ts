import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function writeTextFile(name: string, contents: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  return file;
}

/** Renders HTML to a PDF in cache and opens the share sheet. */
export async function sharePdfFromHtml(html: string, fileName = 'laporan.pdf'): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const src = new File(uri);
  const dest = new File(Paths.cache, fileName);
  if (dest.exists) dest.delete();
  await src.move(dest);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf', dialogTitle: 'Bagikan PDF' });
  }
}

export async function shareCsv(contents: string, fileName: string): Promise<void> {
  const file = writeTextFile(fileName, contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Bagikan CSV' });
  }
}
