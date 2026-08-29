import type { ProductAnalysis, ScoreBreakdown, Verdict } from "@vale-ou-golpe/contracts";
import type { MarketplaceProduct } from "../marketplaces/types.js";
import { createAffiliateUrl } from "../affiliate/affiliate.service.js";

const clamp = (value: number) => Math.max(0, Math.min(10, value));

function verdictFor(score: number): Verdict {
  if (score >= 8) return "vale-muito";
  if (score >= 7) return "vale";
  if (score >= 5) return "atencao";
  if (score >= 3) return "nao-vale";
  return "alto-risco";
}

export function scoreProduct(product: MarketplaceProduct): ProductAnalysis {
  const marketPrices = product.alternatives.map((item) => item.price).filter(Boolean);
  const median = marketPrices.length ? [...marketPrices].sort((a, b) => a - b)[Math.floor(marketPrices.length / 2)] : product.price;
  const difference = median ? (median - product.price) / median : 0;
  const priceScore = clamp(6 + difference * 20);
  const ratingScore = product.rating ? clamp((product.rating / 5) * 10) : 5;
  const reviewScore = product.reviewCount ? clamp(Math.log10(product.reviewCount + 1) * 2.5) : 3;
  const listingScore = clamp((product.image ? 3 : 0) + (product.title.length > 25 ? 3 : 1) + (product.condition === "new" ? 4 : 2));

  const breakdown: ScoreBreakdown = {
    price: priceScore,
    seller: product.sellerScore ?? 5,
    rating: ratingScore,
    reviewVolume: reviewScore,
    listingQuality: listingScore,
    shipping: product.freeShipping ? 10 : 5,
    warranty: product.warranty ? 10 : 4,
  };

  const score = Number((breakdown.price * .35 + breakdown.seller * .2 + breakdown.rating * .15 + breakdown.reviewVolume * .1 + breakdown.listingQuality * .1 + breakdown.shipping * .05 + breakdown.warranty * .05).toFixed(1));
  const verdict = verdictFor(score);
  const reasons = [
    product.freeShipping ? "O anúncio oferece frete grátis." : "O frete pode aumentar o custo final.",
    product.rating ? `A avaliação média é ${product.rating.toFixed(1)} de 5.` : "Ainda não há avaliação suficiente para medir a satisfação.",
    product.sellerScore && product.sellerScore >= 8 ? "O vendedor tem boa reputação na plataforma." : "Vale conferir o histórico e os dados do vendedor.",
  ];
  const warnings: string[] = [];
  if (!product.warranty) warnings.push("Garantia não identificada no anúncio.");
  if (product.reviewCount < 10) warnings.push("Poucas avaliações disponíveis para uma conclusão forte.");

  const cheaper = product.alternatives.find((item) => item.price < product.price * .98);
  const productAffiliate = createAffiliateUrl(product.url);
  const alternative = cheaper ? {
    ...cheaper,
    affiliateUrl: createAffiliateUrl(cheaper.url).url,
    savingsPercent: Number((((product.price - cheaper.price) / product.price) * 100).toFixed(1)),
  } : undefined;

  const labels: Record<Verdict, string> = {
    "vale-muito": "É uma oferta muito competitiva nos dados encontrados.",
    vale: "A compra parece vantajosa, com bons sinais gerais.",
    atencao: "A oferta é razoável, mas merece comparação antes da compra.",
    "nao-vale": "Os dados atuais indicam que existem opções melhores.",
    "alto-risco": "Há poucos sinais positivos; revise o anúncio com bastante cuidado.",
  };

  return {
    marketplace: product.marketplace, title: product.title, image: product.image,
    price: product.price, originalPrice: product.originalPrice, rating: product.rating,
    reviewCount: product.reviewCount, sellerName: product.sellerName,
    sellerReputation: product.sellerReputation, freeShipping: product.freeShipping,
    warranty: product.warranty, score, verdict, summary: labels[verdict], reasons, warnings,
    breakdown, productUrl: product.url, affiliateUrl: productAffiliate.url,
    affiliateConfigured: productAffiliate.configured, alternative,
  };
}
