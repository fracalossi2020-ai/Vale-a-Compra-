import { load } from "cheerio";
import type { MarketplaceProduct, MarketplaceProvider } from "./types.js";

const MARKETPLACES = [
  { name: "Mercado Livre", hosts: ["mercadolivre.com.br", "mercadolivre.com", "meli.la"] },
  { name: "Amazon", hosts: ["amazon.com.br", "amzn.to"] },
  { name: "Shopee", hosts: ["shopee.com.br"] },
  { name: "Magazine Luiza", hosts: ["magazineluiza.com.br", "magalu.com"] },
  { name: "Netshoes", hosts: ["netshoes.com.br"] },
  { name: "Centauro", hosts: ["centauro.com.br"] },
] as const;

function marketplaceFor(hostname: string) {
  return MARKETPLACES.find((marketplace) => marketplace.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)));
}

function objects(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) return value.flatMap(objects);
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, any>;
  return [object, ...objects(object["@graph"])];
}

function isProduct(value: Record<string, any>) {
  const type = value["@type"];
  return type === "Product" || (Array.isArray(type) && type.includes("Product"));
}

function numericPrice(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) return Number(cleaned.replace(/\./g, "").replace(",", "."));
  return Number(cleaned.replace(",", "."));
}

export class StructuredProductProvider implements MarketplaceProvider {
  supports(url: URL) {
    return Boolean(marketplaceFor(url.hostname.toLowerCase()));
  }

  async analyze(inputUrl: URL): Promise<MarketplaceProduct> {
    const initialMarketplace = marketplaceFor(inputUrl.hostname.toLowerCase());
    if (!initialMarketplace) throw new Error("Marketplace não reconhecido.");

    const response = await fetch(inputUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ValeOuGolpe/0.1; +https://localhost)",
        "accept-language": "pt-BR,pt;q=0.9",
      },
    });
    if (!response.ok) throw new Error(`${initialMarketplace.name} bloqueou a consulta do produto (${response.status}).`);

    const resolvedUrl = new URL(response.url);
    const resolvedMarketplace = marketplaceFor(resolvedUrl.hostname.toLowerCase());
    if (!resolvedMarketplace) throw new Error("O link redirecionou para um domínio não permitido.");

    const html = await response.text();
    const $ = load(html);
    const candidates: Record<string, any>[] = [];
    $('script[type="application/ld+json"]').each((_, element) => {
      try { candidates.push(...objects(JSON.parse($(element).text()))); } catch { /* JSON-LD inválido da página */ }
    });
    const product = candidates.find(isProduct);
    if (!product) throw new Error(`Não foi possível ler os dados públicos desse produto na ${resolvedMarketplace.name}.`);

    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    const aggregate = product.aggregateRating ?? {};
    const price = numericPrice(offers?.price ?? offers?.lowPrice ?? product.price);
    if (!product.name || !price) throw new Error("O anúncio não informou título e preço em formato estruturado.");

    const seller = offers?.seller ?? product.brand;
    const image = Array.isArray(product.image) ? product.image[0] : product.image?.url ?? product.image;
    const availability = String(offers?.availability ?? "");

    return {
      id: String(product.sku ?? product.productID ?? resolvedUrl.pathname),
      marketplace: resolvedMarketplace.name,
      title: String(product.name),
      url: resolvedUrl.href,
      image: image ? String(image) : undefined,
      price,
      rating: numericPrice(aggregate.ratingValue) || undefined,
      reviewCount: Number(aggregate.reviewCount ?? aggregate.ratingCount ?? 0),
      sellerName: typeof seller === "string" ? seller : seller?.name,
      sellerScore: undefined,
      sellerReputation: undefined,
      freeShipping: false,
      warranty: product.warranty?.name ?? product.warranty,
      condition: String(offers?.itemCondition ?? "").includes("NewCondition") ? "new" : undefined,
      alternatives: [],
    };
  }
}
