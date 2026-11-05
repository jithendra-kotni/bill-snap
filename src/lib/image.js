async function draw(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

export async function resizeToJpeg(file) {
  // 'from-image' respects the phone's EXIF rotation
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const dataUrl = await draw(bitmap, 1280, 0.8); // sent to the model
  const thumb = await draw(bitmap, 160, 0.6);    // saved in the list
  bitmap.close?.();
  return { dataUrl, thumb };
}