export type Verdict = "vale-muito" | "vale" | "atencao" | "nao-vale" | "alto-risco";

export interface ScoreBreakdown {
  price: number;
  seller: number;
  rating: number;
  reviewVolume: number;
  listingQuality: number;
  shipping: number;
  warranty: number;
}

export interface ProductAlternative {
  title: string;
  price: number;
  url: string;
  affiliateUrl: string;
  savingsPercent: number;
  thumbnail?: string;
}

export interface ProductAnalysis {
  marketplace: string;
  title: string;
  image?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount: number;
  sellerName?: string;
  sellerReputation?: string;
  freeShipping: boolean;
  warranty?: string;
  score: number;
  verdict: Verdict;
  summary: string;
  reasons: string[];
  warnings: string[];
  breakdown: ScoreBreakdown;
  productUrl: string;
  affiliateUrl: string;
  affiliateConfigured: boolean;
  alternative?: ProductAlternative;
}
