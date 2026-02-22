/**
 * Safe fetcher for useSWR: only returns JSON when response is ok.
 * On 4xx/5xx, throws so SWR keeps data undefined and sets error, avoiding
 * .map is not a function when the UI expects an array.
 */
export async function swrFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(res.status === 403 ? "Forbidden" : res.status === 401 ? "Unauthorized" : `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}
