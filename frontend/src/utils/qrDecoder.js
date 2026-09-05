import jsQR from 'jsqr';

export const QR_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const MAX_QR_IMAGE_BYTES = 10 * 1024 * 1024;

export function decodeQrImageData(imageData) {
  return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })?.data?.trim() || '';
}

export async function decodeQrCanvas(canvas, imageData, barcodeDetector) {
  if (barcodeDetector) {
    try {
      const detector = new barcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(canvas);
      const detected = codes.find(code => code.rawValue?.trim())?.rawValue?.trim();
      if (detected) return detected;
    } catch {
      // Native detector availability does not guarantee that construction or
      // detection works on the current platform. Continue with jsQR.
    }
  }
  return decodeQrImageData(imageData);
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); }
    catch { /* Fall through to the HTML image loader. */ }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    if (typeof image.decode === 'function') { image.src = objectUrl; await image.decode(); }
    else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('The selected image could not be loaded.')); image.src = objectUrl; });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function decodeQrImage(file, barcodeDetector = window.BarcodeDetector) {
  if (!file) throw new Error('Select a QR image to continue.');
  if (!QR_IMAGE_TYPES.has(file.type)) throw new Error('Upload a PNG, JPG/JPEG, or WebP image.');
  if (file.size > MAX_QR_IMAGE_BYTES) throw new Error('QR image must be 10 MB or smaller.');

  const source = await loadImage(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) {
    source.close?.();
    throw new Error('The selected image could not be loaded.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    source.close?.();
    throw new Error('QR image decoding is unavailable in this browser.');
  }
  context.drawImage(source, 0, 0, width, height);

  try {
    return decodeQrCanvas(canvas, context.getImageData(0, 0, width, height), barcodeDetector);
  } finally {
    source.close?.();
  }
}
