import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vale ou é Golpe? | Analise antes de comprar",
  description: "Compare preço, reputação, avaliações e alternativas antes de comprar online.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
