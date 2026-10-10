// Saves a file (data: or blob: URL) to the customer's device. Returns false if the browser blocked it.
export function saveFile(url, fileName) {
  try {
    let href = url;
    let blobUrl = null;
    if (url.startsWith('data:') && window.Blob && window.URL?.createObjectURL) {
      const [header, data] = url.split(',');
      const mime = (header.match(/:(.*?);/) || [null, 'image/png'])[1];
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      href = blobUrl;
    }
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return true;
  } catch {
    return false;
  }
}
