// Render the actual HTML card into a downloadable, exact-size PNG. No library.
const source = document.querySelector('.canvas') || document.querySelector('svg');
const controls = document.createElement('div');
controls.style.cssText = 'padding:20px;display:flex;gap:20px;align-items:center;font:14px system-ui;background:#08090b;color:#f5f5f7;width:1200px';
const button = document.createElement('button');
button.textContent = 'Render PNG';
button.style.cssText = 'padding:12px 18px;border:1px solid #666;border-radius:8px;color:inherit;background:#17181b;cursor:pointer';
const download = document.createElement('a');
download.textContent = 'Download PNG';
download.style.color = 'inherit';
download.hidden = true;
controls.append(button, download);
document.body.append(controls);
button.addEventListener('click', async () => {
  button.disabled = true;
  button.textContent = 'Rendering…';
  try {
    await document.fonts.ready;
    const width = source.offsetWidth || 512;
    const height = source.offsetHeight || 512;
    const copy = source.cloneNode(true);
    const originals = [source, ...source.querySelectorAll('*')];
    const copies = [copy, ...copy.querySelectorAll('*')];
    originals.forEach((node, index) => {
      const computed = getComputedStyle(node);
      copies[index].style.cssText = Array.from(computed).map(key => `${key}:${computed.getPropertyValue(key)};`).join('');
    });
    copy.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const markup = new XMLSerializer().serializeToString(copy);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const png = canvas.toDataURL('image/png');
    download.href = png;
    download.download = location.pathname.includes('themes') ? 'themes.png' : location.pathname.includes('icon') ? 'icon-512.png' : 'bareclock.png';
    download.hidden = false;
    const oldPreview = document.getElementById('exported-preview');
    if (oldPreview) oldPreview.remove();
    const preview = new Image();
    preview.id = 'exported-preview';
    preview.alt = `Exported ${width} by ${height} PNG`;
    preview.src = png;
    preview.style.cssText = `display:block;width:${width}px;height:${height}px`;
    document.body.append(preview);
    button.textContent = 'Render again';
  } catch (error) { button.textContent = 'Export failed. Try again.'; console.error(error); }
  finally { button.disabled = false; }
});
