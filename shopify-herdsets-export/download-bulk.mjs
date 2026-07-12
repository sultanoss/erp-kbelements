import fs from 'node:fs/promises';

const response = await fetch(process.env.DOWNLOAD_URL);
if (!response.ok) {
  throw new Error(`Download fehlgeschlagen: ${response.status}`);
}

await fs.writeFile(process.argv[2], Buffer.from(await response.arrayBuffer()));
