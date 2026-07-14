/**
 * Shared regexes for detecting media URLs in Nostr post content.
 *
 * Use (?=[^a-zA-Z0-9]|$) instead of \b — \b fails when the extension
 * ends with a word character (e.g. 'p' in .webp, 'g' in .jpg) and is
 * followed by end-of-string, because \b requires a word↔non-word
 * transition that doesn't fire at end-of-string after a word char.
 */

export const IMAGE_URL_RE = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?(?=[^a-zA-Z0-9]|$)/gi;
export const VIDEO_URL_RE = /https?:\/\/[^\s]+\.(mp4|webm|ogv|mov)(\?[^\s]*)?(?=[^a-zA-Z0-9]|$)/gi;
export const AUDIO_URL_RE = /https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?[^\s]*)?(?=[^a-zA-Z0-9]|$)/gi;

/** Returns a fresh (non-stateful) copy of the image URL regex. */
export const imageUrlRe = () => new RegExp(IMAGE_URL_RE.source, 'gi');
export const videoUrlRe = () => new RegExp(VIDEO_URL_RE.source, 'gi');
export const audioUrlRe = () => new RegExp(AUDIO_URL_RE.source, 'gi');
