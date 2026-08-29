export function createAffiliateUrl(destination: string) {
  const template = process.env.AFFILIATE_REDIRECT_TEMPLATE?.trim();
  if (!template) return { url: destination, configured: false };

  return {
    url: template.replace("{url}", encodeURIComponent(destination)),
    configured: true,
  };
}
