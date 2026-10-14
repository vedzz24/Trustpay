import { Jimp, rgbaToInt, loadFont, measureText, measureTextHeight } from 'jimp';

async function createIcon(size, filename) {
  return new Promise((resolve, reject) => {
    new Jimp({ width: size, height: size, color: rgbaToInt(21, 188, 223, 255) }).then(async (image) => {
      image.write(filename);
      resolve();
    }).catch(e => reject(e));
  });
}

async function run() {
  await createIcon(192, 'icon-192.png');
  await createIcon(512, 'icon-512.png');
  console.log("Icons generated.");
}

run();
