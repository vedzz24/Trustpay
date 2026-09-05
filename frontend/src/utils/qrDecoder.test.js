import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { decodeQrCanvas, decodeQrImageData } from './qrDecoder.js';

function qrImageData(payload, scale = 8, quietZone = 4) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'H' });
  const modules = qr.modules.size;
  const width = (modules + quietZone * 2) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (!qr.modules.get(row, column)) continue;
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          const offset = (((row + quietZone) * scale + y) * width + (column + quietZone) * scale + x) * 4;
          data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 255;
        }
      }
    }
  }
  return { data, width, height: width };
}

for (const payload of [
  'http://192.168.29.237:5173/pay/MER001',
  'http://192.168.29.237:5173/pay/MER002',
  'upi://pay?pa=testmerchant@upi&pn=TestMerchant&am=500',
  'https://google.com@example.invalid/verify',
]) {
  test(`jsQR fallback decodes ${payload}`, () => {
    assert.equal(decodeQrImageData(qrImageData(payload)), payload);
  });
}

test('jsQR fallback returns no value for a random non-QR image', () => {
  const width = 240;
  const data = new Uint8ClampedArray(width * width * 4);
  for (let i = 0; i < data.length; i += 4) {
    const value = (i * 31) % 255;
    data[i] = value; data[i + 1] = 120; data[i + 2] = 210; data[i + 3] = 255;
  }
  assert.equal(decodeQrImageData({ data, width, height: width }), '');
});

test('jsQR fallback can decode a reduced-resolution QR when enough structure remains', () => {
  const payload = 'http://192.168.29.237:5173/pay/MER001';
  assert.equal(decodeQrImageData(qrImageData(payload, 3)), payload);
});

test('jsQR fallback works when BarcodeDetector is unavailable', async () => {
  const payload = 'http://192.168.29.237:5173/pay/MER002';
  assert.equal(await decodeQrCanvas({}, qrImageData(payload), undefined), payload);
});

test('jsQR fallback works when BarcodeDetector throws', async () => {
  class BrokenBarcodeDetector { detect() { throw new Error('not supported'); } }
  const payload = 'upi://pay?pa=testmerchant@upi&pn=TestMerchant&am=500';
  assert.equal(await decodeQrCanvas({}, qrImageData(payload), BrokenBarcodeDetector), payload);
});
