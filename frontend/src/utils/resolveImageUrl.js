const apiBase = import.meta.env.VITE_API_URL || '';
const rootBase = apiBase.replace(/\/api\/?$/, '');

export default function resolveImageUrl(image) {
  if (!image) return image;
  if (image.startsWith('data:')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/uploads') || image.startsWith('uploads/')) {
    if (!rootBase) return image;
    const normalized = image.startsWith('/') ? image : `/${image}`;
    return `${rootBase}${normalized}`;
  }
  return image;
}
