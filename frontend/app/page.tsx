"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ProductAnalysis } from "@vale-a-compra/contracts";
import { ArrowRight, BadgeCheck, Bell, Check, ExternalLink, Link2, LoaderCircle, Search, ShieldCheck, Sparkles, Star, Store, TrendingDown } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const verdicts = {
  "vale-muito": { label: "Vale muito", className: "great" },
  vale: { label: "Vale a compra", className: "good" },
  atencao: { label: "Analise com atenção", className: "warning" },
  "nao-vale": { label: "Provavelmente não vale", className: "danger" },
  "alto-risco": { label: "Alto risco", className: "danger" },
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function identifyMarketplace(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes("mercadolivre") || host === "meli.la") return "Mercado Livre";
    if (host.includes("amazon") || host === "amzn.to") return "Amazon";
    if (host.includes("shopee")) return "Shopee";
    if (host.includes("magazineluiza") || host.includes("magalu")) return "Magazine Luiza";
    if (host.includes("netshoes")) return "Netshoes";
    if (host.includes("centauro")) return "Centauro";
  } catch { return undefined; }
  return undefined;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [analysis, setAnalysis] = useState<ProductAnalysis>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertLoading, setAlertLoading] = useState(false);

  async function analyzeProduct(productUrl: string) {
    if (loading) return;
    setError("");
    setAnalysis(undefined);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: productUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível analisar este link.");
      setAnalysis(data);
      setTimeout(() => document.querySelector("#resultado")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ocorreu um erro inesperado.");
    } finally { setLoading(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await analyzeProduct(url);
  }

  function pasteAndAnalyze(event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedUrl = event.clipboardData.getData("text").trim();
    if (!identifyMarketplace(pastedUrl)) return;
    event.preventDefault();
    setUrl(pastedUrl);
    void analyzeProduct(pastedUrl);
  }

  async function createAlert(event: FormEvent) {
    event.preventDefault();
    if (!analysis) return;
    setAlertLoading(true);
    setAlertMessage("");
    try {
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: alertEmail, productUrl: analysis.productUrl, targetPrice: analysis.price * .95 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Não foi possível criar o alerta.");
      setAlertMessage(data.message);
    } catch (reason) {
      setAlertMessage(reason instanceof Error ? reason.message : "Não foi possível criar o alerta.");
    } finally { setAlertLoading(false); }
  }

  const verdict = analysis ? verdicts[analysis.verdict] : undefined;
  const detectedMarketplace = identifyMarketplace(url);

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#"><span className="brand-mark"><ShieldCheck size={24} /></span><span>Vale a <strong>compra?</strong></span></a>
        <div className="nav-links"><a href="#como-funciona">Como funciona</a><a href="#seguranca">Segurança</a><button className="ghost"><Bell size={17} /> Minhas ofertas</button></div>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><Sparkles size={16} /> Comprar bem começa antes do carrinho</div>
        <h1>Descubra se a oferta<br/><span>vale mesmo a pena.</span></h1>
        <p className="lead">Cole o link do produto. Nós cruzamos preço, reputação, avaliações e ofertas parecidas para entregar uma nota clara.</p>
        <form className="search-box" onSubmit={submit}>
          <Link2 size={22} />
          <input value={url} onChange={(event) => setUrl(event.target.value)} onPaste={pasteAndAnalyze} type="url" required placeholder="Cole aqui o link do produto..." aria-label="URL do produto" />
          <button disabled={loading}>{loading ? <LoaderCircle className="spin" size={21}/> : <Search size={21}/>}<span>{loading ? "Analisando" : "Analisar oferta"}</span></button>
        </form>
        {detectedMarketplace && !error && <div className="detected"><BadgeCheck size={16}/> {detectedMarketplace} identificado {loading && "— analisando a oferta automaticamente..."}</div>}
        {error && <p className="error">{error}</p>}
        <div className="marketplaces"><span>Compatível com</span><b>Mercado Livre</b><b>Amazon</b><b>Shopee</b><span className="soon">Magalu, Netshoes e Centauro</span></div>
      </section>

      {analysis && verdict && (
        <section className="result shell" id="resultado">
          <div className="result-heading"><span>Resultado da análise</span><p>Dados consultados agora em {analysis.marketplace}</p></div>
          <div className="result-grid">
            <article className="product-card">
              <div className="product-image">{analysis.image ? <img src={analysis.image} alt="" /> : <Store size={52}/>}</div>
              <div><span className="marketplace-label">{analysis.marketplace}</span><h2>{analysis.title}</h2><div className="product-meta"><b>{money.format(analysis.price)}</b>{analysis.rating && <span><Star size={16} fill="currentColor"/> {analysis.rating.toFixed(1)} ({analysis.reviewCount})</span>}</div><p className="seller"><BadgeCheck size={17}/> {analysis.sellerName ?? "Vendedor não identificado"}</p></div>
            </article>
            <article className={`score-card ${verdict.className}`}>
              <div className="score-ring"><strong>{analysis.score}</strong><small>/10</small></div>
              <div><span className="verdict">{verdict.label}</span><h3>{analysis.summary}</h3><p>A nota combina sete sinais e não depende apenas do menor preço.</p></div>
            </article>
          </div>

          <div className="details-grid">
            <article className="panel"><h3>Por que recebeu essa nota?</h3><ul>{analysis.reasons.map((reason) => <li key={reason}><Check size={18}/>{reason}</li>)}</ul>{analysis.warnings.map((warning) => <p className="warning-line" key={warning}>Atenção: {warning}</p>)}</article>
            <article className="panel metrics"><h3>Raio-X da oferta</h3>{Object.entries(analysis.breakdown).map(([key, value]) => <div className="metric" key={key}><span>{({price:"Preço",seller:"Vendedor",rating:"Avaliação",reviewVolume:"Volume de opiniões",listingQuality:"Qualidade do anúncio",shipping:"Frete",warranty:"Garantia"} as Record<string,string>)[key]}</span><div><i style={{width:`${value * 10}%`}}/></div><b>{value.toFixed(1)}</b></div>)}</article>
          </div>

          {analysis.alternative ? <article className="alternative"><div className="alternative-icon"><TrendingDown/></div><div><span>Encontramos uma alternativa melhor</span><h3>Economize {analysis.alternative.savingsPercent}% — {money.format(analysis.alternative.price)}</h3><p>{analysis.alternative.title}</p></div><a href={analysis.alternative.affiliateUrl} target="_blank" rel="sponsored noopener">Ver melhor oferta <ExternalLink size={17}/></a></article> : <article className="alert-card"><Bell/><div><h3>Nenhuma oferta claramente melhor agora.</h3><p>Crie um alerta e receba um aviso quando o preço cair pelo menos 5%.</p></div><button className="alert-button" onClick={() => setAlertOpen((open) => !open)}>{alertOpen ? "Fechar" : "Criar alerta"}</button></article>}
          {!analysis.alternative && alertOpen && <form className="alert-form" onSubmit={createAlert}><label><span>Seu melhor e-mail</span><input type="email" required value={alertEmail} onChange={(event) => setAlertEmail(event.target.value)} placeholder="voce@email.com" /></label><button disabled={alertLoading}>{alertLoading ? "Salvando..." : "Avisar quando baixar"}</button>{alertMessage && <p>{alertMessage}</p>}</form>}
          {!analysis.affiliateConfigured && <p className="affiliate-note">Os links ainda são diretos. Configure o adaptador de afiliados antes da publicação comercial.</p>}
        </section>
      )}

      <section className="how shell" id="como-funciona"><div><span className="section-kicker">Simples e transparente</span><h2>Uma decisão melhor em três passos.</h2></div><div className="steps"><article><b>01</b><Link2/><h3>Cole o link</h3><p>Envie a URL do produto que você está pensando em comprar.</p></article><article><b>02</b><Sparkles/><h3>Nós analisamos</h3><p>Comparamos os sinais mais importantes da oferta e do vendedor.</p></article><article><b>03</b><ArrowRight/><h3>Decida com clareza</h3><p>Receba uma nota, os motivos e uma alternativa mais econômica.</p></article></div></section>
      <section className="trust" id="seguranca"><div className="shell"><ShieldCheck size={34}/><div><h2>Nota explicada, sem promessa mágica.</h2><p>Mostramos os critérios utilizados. “Alto risco” representa sinais insuficientes ou desfavoráveis — não uma acusação contra a loja.</p></div></div></section>
      <footer className="shell"><a className="brand" href="#"><span className="brand-mark"><ShieldCheck size={21}/></span><span>Vale a <strong>compra?</strong></span></a><p>Compare. Entenda. Compre melhor.</p></footer>
    </main>
  );
}
