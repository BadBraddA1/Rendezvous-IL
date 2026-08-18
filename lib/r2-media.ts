import "server-only"

/**
 * App-facing entry point for R2 media. The `server-only` guard keeps the upload
 * secret out of any client bundle; the implementation lives in lib/media-store.ts
 * so Node scripts can reuse it.
 */

export {
  isR2MediaConfigured,
  putMediaObject,
  deleteMediaObject,
  deleteMediaUrl,
} from "./media-store"

export { mediaKeyFromUrl, r2PublicUrl, toPublicMediaUrl } from "./media-keys"
