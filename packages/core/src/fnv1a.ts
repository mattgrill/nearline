const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * FNV-1a hash for a string.
 * Operates on charCode values directly (no encoding overhead).
 */
export function fnv1aString(str: string, offset = 0, length = str.length): number {
  let hash = FNV_OFFSET_BASIS;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * FNV-1a hash for a Uint32Array slice.
 * Used for LSH band hashing.
 */
export function fnv1aUint32(arr: Uint32Array, offset: number, length: number): number {
  let hash = FNV_OFFSET_BASIS;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    const val = arr[i];
    hash ^= val & 0xff;
    hash = Math.imul(hash, FNV_PRIME);
    hash ^= (val >>> 8) & 0xff;
    hash = Math.imul(hash, FNV_PRIME);
    hash ^= (val >>> 16) & 0xff;
    hash = Math.imul(hash, FNV_PRIME);
    hash ^= (val >>> 24) & 0xff;
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}
