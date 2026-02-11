function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getR2PublicBaseUrl(): string {
  const configuredBase = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (configuredBase) {
    try {
      const parsed = new URL(configuredBase);
      return trimTrailingSlash(`${parsed.origin}${parsed.pathname}`);
    } catch {
      // Fall through to derived default.
    }
  }

  const bucketName = process.env.R2_BUCKET_NAME || "bearing-uploads";
  return `https://${bucketName}.r2.dev`;
}

export function toPublicR2Url(storageKey: string): string {
  const safeKey = storageKey.replace(/^\/+/, "");
  return `${getR2PublicBaseUrl()}/${safeKey}`;
}

export function extractR2KeyFromUrl(urlOrKey: string): string | null {
  const normalizedInput = urlOrKey.trim();
  if (!normalizedInput) return null;

  // Canonical Story 8.8 pattern: direct storage path keys.
  if (!/^https?:\/\//i.test(normalizedInput)) {
    return normalizedInput.replace(/^\/+/, "");
  }

  try {
    const parsed = new URL(normalizedInput);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

export function buildDestinationUrl(sourceUrl: string, destinationKey: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const bucketHostname = process.env.R2_BUCKET_NAME || "bearing-uploads";
    if (parsed.hostname !== bucketHostname) {
      return `${parsed.origin}/${destinationKey}`;
    }
  } catch {
    // Fall through to configured public base URL.
  }

  return toPublicR2Url(destinationKey);
}

export function getFileExtensionFromKey(key: string): string {
  const extension = key.includes(".") ? key.split(".").pop() || "webp" : "webp";
  if (extension === "jpg") return "jpeg";
  return extension;
}

export function toContentTypeFromExtension(extension: string): string {
  return `image/${extension}`;
}

interface CoverImageRecordLike {
  url?: unknown;
  storage_path?: unknown;
}

export function resolveCoverImageStoragePath(image: CoverImageRecordLike): string | null {
  if (typeof image.storage_path === "string" && image.storage_path.length > 0) {
    return image.storage_path;
  }

  if (typeof image.url === "string" && image.url.length > 0) {
    return extractR2KeyFromUrl(image.url);
  }

  return null;
}

export function resolveCoverImageUrl(image: CoverImageRecordLike): string | null {
  if (typeof image.url === "string" && image.url.length > 0) {
    return image.url;
  }

  const storagePath = resolveCoverImageStoragePath(image);
  if (!storagePath) return null;
  return toPublicR2Url(storagePath);
}
