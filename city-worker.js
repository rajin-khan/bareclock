import { buildDirectory, searchDirectory } from './city-directory.js';

let directoryPromise;
let latestRequest = 0;

function loadDirectory() {
  if (!directoryPromise) directoryPromise = (async () => {
    let data;
    if (typeof DecompressionStream === 'function') {
      const response = await fetch('./data/cities.json.gz');
      if (!response.ok) throw new Error('Directory unavailable');
      // Some static hosts serve .gz with Content-Encoding, so sniff the bytes
      // before decompressing to avoid decoding an already-decoded response.
      const bytes = new Uint8Array(await response.arrayBuffer());
      const stream = new Blob([bytes]).stream();
      const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b ? stream.pipeThrough(new DecompressionStream('gzip')) : stream;
      data = await new Response(decoded).json();
    } else {
      const response = await fetch('./data/cities.json');
      if (!response.ok) throw new Error('Directory unavailable');
      data = await response.json();
    }
    return buildDirectory(data);
  })().catch(error => { directoryPromise = null; throw error; });
  return directoryPromise;
}

self.addEventListener('message', async event => {
  const { id, query, limit } = event.data;
  latestRequest = id;
  try {
    const entries = await loadDirectory();
    if (id !== latestRequest) return;
    self.postMessage({ id, ...searchDirectory(entries, query, limit), directoryCount: entries.length });
  } catch {
    if (id === latestRequest) self.postMessage({ id, error: true });
  }
});
