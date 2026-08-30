import type { MarketplaceProduct, MarketplaceProvider } from "./types.js";
import { getMercadoLivreToken } from "./mercado-livre-token.js";

const ALLOWED_HOSTS = ["mercadolivre.com.br", "mercadolivre.com", "meli.la"];

function isAllowedHost(hostname: string) {
  return ALLOWED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function extractItemId(value: string) {
  const decoded = decodeURIComponent(value).toUpperCase();
  const match = decoded.match(/MLB[-_]?([0-9]{6,})/);
  return match ? `MLB${match[1]}` : undefined;
}

export class MercadoLivreProvider implements MarketplaceProvider {
  supports(url: URL) {
    return isAllowedHost(url.hostname.toLowerCase());
  }

  private async headers() {
    const token = await getMercadoLivreToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }

  private async api<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.mercadolibre.com${path}`, { headers: await this.headers() });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`A API do Mercado Livre recusou ${path.split("?")[0]} com status ${response.status}.`);
      }
      throw new Error(`Mercado Livre respondeu com erro ${response.status}.`);
    }
    return response.json() as Promise<T>;
  }

  async analyze(inputUrl: URL): Promise<MarketplaceProduct> {
    let productUrl = inputUrl;
    let itemId = extractItemId(inputUrl.href);

    if (!itemId) {
      const resolved = await fetch(inputUrl, { redirect: "follow", signal: AbortSignal.timeout(8_000) });
      productUrl = new URL(resolved.url);
      if (!isAllowedHost(productUrl.hostname.toLowerCase())) throw new Error("O link redirecionou para um domínio não permitido.");
      itemId = extractItemId(productUrl.href);
    }
    if (!itemId) throw new Error("Não encontrei o código do produto nesse link do Mercado Livre.");

    const item = await this.api<any>(`/items/${itemId}`);
    const [salePrice, reviews, seller, search] = await Promise.allSettled([
      this.api<any>(`/items/${itemId}/sale_price?context=channel_marketplace`),
      this.api<any>(`/reviews/item/${itemId}`),
      this.api<any>(`/users/${item.seller_id}`),
      this.api<any>(`/sites/MLB/search?q=${encodeURIComponent(item.title)}&limit=12`),
    ]);

    const priceData = salePrice.status === "fulfilled" ? salePrice.value : undefined;
    const reviewData = reviews.status === "fulfilled" ? reviews.value : undefined;
    const sellerData = seller.status === "fulfilled" ? seller.value : undefined;
    const searchResults = search.status === "fulfilled" ? search.value.results ?? [] : [];
    const price = Number(priceData?.amount ?? item.price ?? 0);

    const alternatives = searchResults
      .filter((candidate: any) => candidate.id !== itemId && Number(candidate.price) > 0)
      .map((candidate: any) => ({
        title: String(candidate.title),
        price: Number(candidate.price),
        url: String(candidate.permalink),
        thumbnail: candidate.thumbnail ? String(candidate.thumbnail).replace("http://", "https://") : undefined,
      }))
      .sort((a: any, b: any) => a.price - b.price)
      .slice(0, 8);

    const level = sellerData?.seller_reputation?.level_id as string | undefined;
    const sellerScore = level?.startsWith("5_") ? 10 : level?.startsWith("4_") ? 8 : level?.startsWith("3_") ? 6 : 4;

    return {
      id: itemId,
      marketplace: "Mercado Livre",
      title: item.title,
      url: item.permalink ?? productUrl.href,
      image: item.pictures?.[0]?.secure_url ?? item.thumbnail?.replace("http://", "https://"),
      price,
      originalPrice: Number(priceData?.regular_amount ?? item.original_price) || undefined,
      rating: Number(reviewData?.rating_average) || undefined,
      reviewCount: Number(reviewData?.paging?.total ?? 0),
      sellerName: sellerData?.nickname,
      sellerReputation: level,
      sellerScore,
      freeShipping: Boolean(item.shipping?.free_shipping),
      warranty: item.warranty,
      condition: item.condition,
      alternatives,
    };
  }
}
