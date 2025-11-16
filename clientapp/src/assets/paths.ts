// Compute base URL for assets folder relative to this JS chunk URL
const computePublicAssetsBase = () => {
  const url = import.meta.url;
  const idx = url.lastIndexOf('/assets/');
  if (idx !== -1) {
    return url.substring(0, idx + '/assets/'.length);
  }
  const u = new URL('.', url).toString();
  return u.endsWith('/') ? u : `${u}/`;
};

export const PUBLIC_ASSETS_BASE = computePublicAssetsBase();
export const LOGO = `${PUBLIC_ASSETS_BASE}logo.png`;
export const asset = (name: string) => `${PUBLIC_ASSETS_BASE}${name}`;
export const TING = asset('ting.mp3');
export const BANNERS = ['banner-1.jpg','banner-2.png','banner-3.jpg','banner-4.jpg'].map(asset);
