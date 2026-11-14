import type React from 'react';

const FALLBACK_SRC = '/user-placeholder.svg';

export function normalizeImageUrl(url?: string) {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  let normalized = url.trim();
  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }
  if (!/^https?:\/\//.test(normalized) && normalized.includes('res.cloudinary.com')) {
    normalized = `https://${normalized}`;
  }
  if (normalized.startsWith('http://res.cloudinary.com')) {
    normalized = normalized.replace('http://', 'https://');
  }
  return encodeURI(normalized);
}

export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === 'true') {
    return;
  }
  target.dataset.fallbackApplied = 'true';
  target.src = FALLBACK_SRC;
  target.classList.add('image-fallback');
}
