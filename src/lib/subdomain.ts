export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
}

export function extractSubdomain(host: string): string | null {
  const root = getRootDomain();
  const rootWithoutPort = root.split(":")[0];
  const hostWithoutPort = host.split(":")[0];

  if (hostWithoutPort === rootWithoutPort || hostWithoutPort === "localhost") {
    return null;
  }

  if (rootWithoutPort === "localhost") {
    const match = hostWithoutPort.match(/^(.+)\.localhost$/);
    return match ? match[1] : null;
  }

  const rootParts = rootWithoutPort.split(".");
  const hostParts = hostWithoutPort.split(".");
  if (hostParts.length > rootParts.length) {
    const sub = hostParts.slice(0, hostParts.length - rootParts.length).join(".");
    return sub || null;
  }

  return null;
}

export function isAdminSubdomain(host: string): boolean {
  return extractSubdomain(host) === "admin";
}

export function getShopSlug(host: string): string | null {
  const sub = extractSubdomain(host);
  if (!sub || sub === "admin") return null;
  return sub;
}

export function buildSubdomainUrl(slug: string, path = ""): string {
  const root = getRootDomain();
  const protocol = root.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${root}${path}`;
}
