export interface MarketplaceProduct {
  id: string;
  marketplace: string;
  title: string;
  url: string;
  image?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount: number;
  sellerName?: string;
  sellerReputation?: string;
  sellerScore?: number;
  freeShipping: boolean;
  warranty?: string;
  condition?: string;
  alternatives: Array<{ title: string; price: number; url: string; thumbnail?: string }>;
}

export interface MarketplaceProvider {
  supports(url: URL): boolean;
  analyze(url: URL): Promise<MarketplaceProduct>;
}
