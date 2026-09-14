# Buscador de Leads

Sisteminha de gestão de leads para prospecção de sites. Busca negócios locais
(restaurantes, petshops, lojas etc.) por tipo + cidade/estado usando dados abertos do
**OpenStreetMap** — sem chave de API — e guarda cada lead num banco Postgres local, com
funil (Novo → Contatado → Respondeu → Negociando → Fechado/Perdido), notas, e-mail e
histórico de contato.

Para cada lead:
- Nome, endereço, telefone, site, link do Google Maps
- Botão de WhatsApp (wa.me) com mensagem persuasiva pronta oferecendo criação de site
- Busca de e-mail no site do negócio (mailto pronto com a mesma proposta)
- Etapa do funil, favorito, notas e timeline de interações

Stack: Next.js 14 (App Router) · Prisma + Postgres · shadcn/ui · SWR.

## Como rodar

Pré-requisito: **Docker** (para o Postgres) e Node 20+.

```bash
npm install          # instala deps + gera o Prisma Client
npm run db:up        # sobe o Postgres no Docker (porta 5432)
npm run db:migrate   # cria as tabelas
npm run dev          # http://localhost:3001
```

Comandos de banco:

| Comando | O que faz |
|---|---|
| `npm run db:up` / `npm run db:down` | sobe / derruba o container do Postgres |
| `npm run db:studio` | abre o Prisma Studio (GUI dos leads) em :5555 |
| `npm run db:migrate` | aplica migrations (após mudar `prisma/schema.prisma`) |
| `npm run db:reset` | **apaga tudo** e recria o banco do zero |

Os dados ficam num volume Docker (`leadfinder-pgdata`) e sobrevivem a `db:down`.
Config em `.env` (`DATABASE_URL`) — já vem pronto para o Docker local.

## Como funciona

- `app/api/search/route.ts` — a busca em duas etapas, tudo via OpenStreetMap:
  1. **Nominatim** (`nominatim.openstreetmap.org`) transforma `"{cidade}, {estado}, Brasil"`
     na área geográfica correspondente.
  2. **Overpass** (`overpass-api.de`, com servidores alternativos de fallback) lista os
     estabelecimentos daquela área que batem com o tipo de negócio.
- `lib/osm-tags.ts` — traduz o tipo digitado em português (ex.: "petshop", "farmácia",
  "oficina mecânica") para as tags do OpenStreetMap (`shop=pet`, `amenity=pharmacy`,
  `shop=car_repair`...). Se o tipo não estiver no mapa, cai numa busca pelo **nome** do
  estabelecimento.
- `app/api/enrich-email/route.ts` — dado o site de um lead, busca a página inicial e procura
  um e-mail de contato (via `mailto:` ou regex). Nem todo site vai ter um e-mail visível.
- `lib/message.ts` — templates das mensagens persuasivas de WhatsApp/e-mail.
- `data/estados.ts` — lista dos 27 estados brasileiros para o formulário.
- A lista de cidades é buscada em tempo real na API pública do IBGE, direto do navegador.

### Persistência e gestão

- `prisma/schema.prisma` — modelos `Lead`, `Interaction`, `Setting`.
- `lib/leads.ts` — camada de acesso ao banco: `upsertLeadsFromSearch` (cria os leads novos
  da busca sem mexer em status/notas dos que já existem), `listLeads` (filtros + paginação),
  `leadStats`, `addInteraction` etc.
- `app/api/leads/*` — REST da lista, detalhe, PATCH de status/notas/favorito, interações.
- `app/api/stats` — contadores do funil + facetas (cidades/categorias no banco).
- UI em `components/leads/*`: tabela com filtros à esquerda + painel lateral de detalhe.

## Limitações

- A cobertura do OpenStreetMap para negócios pequenos varia bastante por cidade e por
  categoria. Cidades grandes e categorias comuns (restaurante, farmácia, mercado) trazem
  dezenas de resultados; cidades menores ou nichos podem trazer poucos.
- Telefone e site só aparecem quando alguém cadastrou essa informação no mapa.
- A API pública do Overpass tem limite de uso. Se fizer muitas buscas seguidas, pode
  responder com erro temporário — basta esperar alguns segundos e tentar de novo.
