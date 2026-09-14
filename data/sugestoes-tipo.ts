// Ordem = prioridade de quem mais precisa/se beneficia de um site, do maior
// pro menor. Importa de verdade: é a mesma ordem usada por "Buscar todas as
// categorias" — parar no meio deixa os melhores prospects já processados.
// Compartilhado pelos diálogos de busca nacional e internacional.
export const SUGESTOES_TIPO = [
  // 1) Serviços profissionais de ticket alto — cliente pesquisa e compara
  // antes de contratar; um site pesa na decisão.
  "Imobiliária", "Advogado", "Contador", "Corretor de seguros", "Arquiteto",
  "Consultoria", "Construtora",

  // 2) Saúde agendada — cliente busca no Google antes de marcar consulta.
  // "Médico especialista" junta cardiologista, dermatologista, pediatra etc.
  // numa categoria só (todos usam a mesma tag de especialidade no OSM); pra
  // uma especialidade específica, basta digitar o nome dela direto no campo.
  "Dentista", "Clínica", "Fisioterapia", "Psicólogo", "Nutricionista",
  "Médico especialista", "Clínica veterinária",

  // 3) Vitrine visual/portfólio — o site é parte do produto de vendas.
  "Estúdio de fotografia", "Hotel", "Pousada", "Espaço de eventos", "Buffet infantil",

  // 4) Beleza e bem-estar agendados — hoje vivem só de Instagram/WhatsApp,
  // um site profissionaliza e facilita agendamento.
  "Salão de beleza", "Barbearia", "Estética",
  "Estúdio de tatuagem", "Academia", "Estúdio de pilates", "Escola de dança",

  // 5) Comida com encomenda/cardápio — cardápio e delivery no site ajudam.
  "Restaurante", "Pizzaria", "Hamburgueria", "Marmitaria", "Confeitaria", "Padaria",

  // 6) Varejo com potencial de catálogo/e-commerce.
  "Joalheria", "Relojoaria", "Loja de móveis", "Loja de decoração", "Loja de colchões",
  "Floricultura", "Loja de festas", "Loja de roupas", "Loja infantil", "Lingerie",
  "Loja de calçados", "Loja de bijuterias", "Loja de celular", "Loja de informática",
  "Loja de games", "Loja de instrumentos musicais", "Livraria", "Petshop", "Ótica",

  // 7) Obras e serviços por orçamento — portfólio no site ajuda a fechar.
  "Comunicação visual", "Gráfica", "Marcenaria", "Ar condicionado", "Empresa de limpeza",
  "Loja de material de construção", "Loja de tintas",

  // 8) Ofícios técnicos e cursos — meio-termo, ainda vivem de indicação.
  "Marmoraria", "Vidraçaria", "Serralheria", "Assistência técnica", "Escola de idiomas",
  "Cursinho", "Autoescola",

  // 9) Comida do dia a dia — cliente passa na frente ou usa iFood, site pesa pouco.
  "Lanchonete", "Pastelaria", "Sorveteria", "Cafeteria", "Bar",

  // 10) Automotivo — decisão por Google Maps/indicação, raramente visita site.
  "Oficina mecânica", "Auto elétrica", "Funilaria", "Oficina de motos", "Borracharia",
  "Lava rápido", "Estética automotiva", "Loja de autopeças",

  // 11) Urgência/emergência — cliente quer telefone na hora, não navega site.
  "Desentupidora", "Dedetizadora", "Chaveiro",

  // 12) Commodity/abastecimento — compra por proximidade, site quase não pesa.
  "Mercado", "Hortifruti", "Açougue", "Agropecuária", "Farmácia", "Lavanderia",
  "Papelaria", "Brechó", "Sapataria",

  // 13) Já tende a ter site próprio — não é bom lead pra vender site.
  "Agência de marketing digital",
];
