# Vale ou é Golpe?

MVP para analisar ofertas de e-commerce usando preço, reputação do vendedor, avaliações, qualidade do anúncio, frete e garantia.

## Estrutura

- `frontend/`: interface Next.js responsiva em branco e verde.
- `backend/`: API Fastify, integrações e motor de pontuação.
- `database/`: schema PostgreSQL para análises e alertas.
- `packages/contracts/`: contratos TypeScript compartilhados.
- `infrastructure/`: ambiente local do PostgreSQL.

## Executar

1. Copie `.env.example` para `.env` e preencha o token do Mercado Livre.
2. Execute `npm install`.
3. Opcional: execute `docker compose -f infrastructure/docker-compose.yml up -d`.
4. Execute `npm run dev`.
5. Acesse `http://localhost:3000`.

## Integrações

O Mercado Livre possui um provedor dedicado. Amazon, Shopee, Magalu, Netshoes e Centauro usam inicialmente os dados estruturados públicos do anúncio; uma plataforma pode bloquear essa consulta e, nesse caso, a API informa a limitação. Para produção, cada marketplace deve receber um adaptador oficial conforme sua API e seu programa de afiliados.

`AFFILIATE_REDIRECT_TEMPLATE` recebe um modelo como `https://seu-redirecionador.com/?url={url}`. Sem isso, o site mantém o link original e informa que a monetização não está configurada.

O resultado usa “alto risco” em vez de afirmar que uma empresa é golpe. A pontuação é uma ajuda à decisão e deve sempre exibir os fatores que a formaram.

## Railway

O projeto pode ser publicado como um único serviço. O Next.js atende na porta pública do Railway e encaminha `/api` para o backend na porta interna `4000`.

### Serviço único (recomendado)

- Root directory: `/`
- Build command: `npm run build`
- Start command: `npm run start`
- Variável: `BACKEND_PORT=4000`

Não defina `NEXT_PUBLIC_API_URL` nesse modo; a interface usa `/api` no mesmo domínio.

### Serviços separados (alternativa)

Se preferir escalar cada parte de maneira independente, use dois serviços e mantenha o diretório raiz de ambos como `/`.

### Backend

- Build command: `npm run railway:build:backend`
- Start command: `npm run railway:start:backend`
- Healthcheck: `/health`

### Frontend

- Build command: `npm run railway:build:frontend`
- Start command: `npm run railway:start:frontend`

O workspace `@vale-ou-golpe/contracts` é uma biblioteca compartilhada e não deve existir como serviço no Railway.
