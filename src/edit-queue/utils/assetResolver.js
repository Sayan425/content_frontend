export const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  // Remove leading slash or public/ prefix
  let cleanUrl = url;
  if (cleanUrl.startsWith('/')) {
    cleanUrl = cleanUrl.slice(1);
  }
  if (cleanUrl.startsWith('public/')) {
    cleanUrl = cleanUrl.slice(7);
  }

  // If the path refers to the local static assets folder, load it locally!
  if (cleanUrl.startsWith('assets/')) {
    return `/${cleanUrl}`;
  }

  if (import.meta.env.DEV) {
    return `/r2-assets/${cleanUrl}`;
  }

  return `https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev/${cleanUrl}`;
};
