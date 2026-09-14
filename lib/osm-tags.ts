/**
 * Traduz um "tipo de negócio" digitado em português para filtros de tag do
 * OpenStreetMap, usados na query Overpass. Sem isso a busca não tem como saber
 * que "petshop" = shop=pet, "farmácia" = amenity=pharmacy, etc.
 */

/** Minúsculas, sem acento, espaços colapsados. */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cada valor é uma lista de trechos de filtro Overpass (sem o escopo de área),
 * ex.: '["amenity"="restaurant"]'. Vários trechos = união (OR).
 * As chaves já vêm normalizadas (sem acento, minúsculas).
 */
const MAPA: Record<string, string[]> = {
  // comida e bebida
  restaurante: ['["amenity"="restaurant"]'],
  pizzaria: [
    '["amenity"~"restaurant|fast_food"]["cuisine"~"pizza"]',
    '["amenity"~"restaurant|fast_food"]["name"~"pizz",i]',
  ],
  lanchonete: ['["amenity"="fast_food"]'],
  hamburgueria: ['["amenity"="fast_food"]["cuisine"~"burger"]', '["amenity"]["name"~"burger|hamburgueria|burgueria",i]'],
  churrascaria: ['["amenity"="restaurant"]["cuisine"~"barbecue|steak_house"]', '["amenity"]["name"~"churrasc",i]'],
  "restaurante japones": ['["amenity"="restaurant"]["cuisine"~"japanese|sushi"]', '["amenity"]["name"~"sushi|temaki|japa",i]'],
  bar: ['["amenity"="bar"]', '["amenity"="pub"]'],
  "casa noturna": ['["amenity"="nightclub"]'],
  cafeteria: ['["amenity"="cafe"]'],
  cafe: ['["amenity"="cafe"]'],
  padaria: ['["shop"="bakery"]'],
  confeitaria: ['["shop"~"pastry|confectionery"]', '["shop"]["name"~"confeitar|doceria|bolo",i]'],
  sorveteria: [
    '["amenity"="ice_cream"]',
    '["shop"="ice_cream"]',
    '["amenity"]["name"~"sorvet|gelateria|acai",i]',
    '["shop"]["name"~"sorvet|gelateria|acai",i]',
  ],
  "loja de acai": ['["name"~"acai",i]'],
  "loja de conveniencia": ['["shop"="convenience"]'],
  adega: ['["shop"~"wine|alcohol"]'],
  "loja de bebidas": ['["shop"="alcohol"]', '["shop"]["name"~"distribuidora de bebidas|adega",i]'],

  // mercado / alimentos
  mercado: ['["shop"~"supermarket|convenience|grocery"]'],
  supermercado: ['["shop"="supermarket"]'],
  mercearia: ['["shop"~"convenience|grocery"]'],
  hortifruti: ['["shop"="greengrocer"]', '["shop"]["name"~"hortifruti|frutaria|sacolao",i]'],
  acougue: ['["shop"="butcher"]'],
  peixaria: ['["shop"="seafood"]'],
  "loja de produtos naturais": ['["shop"~"health_food|nutrition_supplements"]', '["shop"]["name"~"produtos naturais|natural",i]'],

  // pet
  petshop: ['["shop"="pet"]'],
  "pet shop": ['["shop"="pet"]'],
  pet: ['["shop"="pet"]'],
  veterinario: ['["amenity"="veterinary"]'],
  "clinica veterinaria": ['["amenity"="veterinary"]'],
  "banho e tosa": ['["shop"="pet_grooming"]', '["shop"]["name"~"banho e tosa|tosa",i]'],

  // beleza e bem-estar
  "salao de beleza": ['["shop"~"beauty|hairdresser"]'],
  cabeleireiro: ['["shop"="hairdresser"]'],
  barbearia: ['["shop"="hairdresser"]', '["shop"]["name"~"barbear|barber",i]'],
  "estetica": ['["shop"="beauty"]', '["shop"]["name"~"estetica|estetic",i]'],
  manicure: ['["shop"="beauty"]', '["shop"]["name"~"manicure|nail|esmalteria",i]'],
  "clinica de estetica": ['["shop"="beauty"]', '["healthcare"="beautician"]'],
  spa: ['["leisure"="spa"]', '["shop"="massage"]'],
  academia: [
    '["leisure"="fitness_centre"]',
    '["amenity"="gym"]',
    '["amenity"]["name"~"academia|fitness|crossfit",i]',
  ],
  "estudio de pilates": [
    '["leisure"="fitness_centre"]["fitness_station"~"pilates"]',
    '["leisure"]["name"~"pilates",i]',
  ],

  // saúde
  farmacia: ['["amenity"="pharmacy"]'],
  drogaria: ['["amenity"="pharmacy"]'],
  dentista: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  "consultorio odontologico": ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  clinica: ['["amenity"="clinic"]', '["healthcare"~"clinic|centre"]'],
  "clinica medica": ['["amenity"="clinic"]', '["healthcare"~"clinic|centre"]'],
  consultorio: ['["amenity"="doctors"]', '["healthcare"="doctor"]'],
  medico: ['["amenity"="doctors"]', '["healthcare"="doctor"]'],
  hospital: ['["amenity"="hospital"]'],
  laboratorio: ['["healthcare"="laboratory"]', '["healthcare"]["name"~"laboratorio|analises clinicas",i]'],
  fisioterapia: ['["healthcare"="physiotherapist"]', '["healthcare"]["name"~"fisioterap",i]'],
  psicologo: ['["healthcare"="psychotherapist"]', '["healthcare"]["name"~"psicolog",i]'],
  nutricionista: ['["healthcare"="nutrition_counselling"]', '["healthcare"]["name"~"nutri",i]'],

  // médicos especialistas — usam a tag "healthcare:speciality" (valores em
  // inglês, padronizados pelo OSM), separada do nome. Filtro direto por essa
  // tag: já é uma chave rara o suficiente pra não precisar de outra
  // restrição, e muito mais preciso que procurar a especialidade no nome.
  cardiologista: ['["healthcare:speciality"~"cardiology",i]'],
  dermatologista: ['["healthcare:speciality"~"dermatology",i]'],
  ginecologista: ['["healthcare:speciality"~"gynaecology|gynecology",i]'],
  pediatra: ['["healthcare:speciality"~"paediatrics|pediatrics",i]'],
  ortopedista: ['["healthcare:speciality"~"orthopaedics|orthopedics|traumatology",i]'],
  oftalmologista: ['["healthcare:speciality"~"ophthalmology",i]'],
  otorrino: ['["healthcare:speciality"~"otolaryngology|otorhinolaryngology",i]'],
  otorrinolaringologista: ['["healthcare:speciality"~"otolaryngology|otorhinolaryngology",i]'],
  urologista: ['["healthcare:speciality"~"urology",i]'],
  endocrinologista: ['["healthcare:speciality"~"endocrinology",i]'],
  neurologista: ['["healthcare:speciality"~"neurology",i]'],
  psiquiatra: ['["healthcare:speciality"~"psychiatry",i]'],
  gastroenterologista: ['["healthcare:speciality"~"gastroenterology",i]'],
  reumatologista: ['["healthcare:speciality"~"rheumatology",i]'],
  oncologista: ['["healthcare:speciality"~"oncology",i]'],
  geriatra: ['["healthcare:speciality"~"geriatrics",i]'],
  pneumologista: ['["healthcare:speciality"~"pulmonology",i]'],
  "cirurgiao plastico": ['["healthcare:speciality"~"plastic_surgery",i]'],
  alergista: ['["healthcare:speciality"~"allergology",i]'],
  mastologista: ['["healthcare:speciality"~"gynaecology_oncology|mastology",i]'],

  otica: ['["shop"="optician"]'],
  "loja de suplementos": ['["shop"="nutrition_supplements"]', '["shop"]["name"~"suplement",i]'],

  // automotivo
  "oficina mecanica": ['["shop"="car_repair"]'],
  "auto eletrica": ['["shop"="car_repair"]', '["shop"]["name"~"auto eletrica|eletrica automotiva",i]'],
  funilaria: ['["shop"="car_repair"]', '["shop"]["name"~"funilaria|lanternagem|pintura",i]'],
  "lava rapido": ['["amenity"="car_wash"]'],
  "auto center": ['["shop"="car_repair"]', '["shop"="tyres"]'],
  borracharia: ['["shop"="tyres"]', '["shop"]["name"~"borracharia|pneus",i]'],
  "posto de gasolina": ['["amenity"="fuel"]'],
  concessionaria: ['["shop"="car"]'],
  "loja de autopecas": ['["shop"="car_parts"]'],
  "loja de motos": ['["shop"="motorcycle"]'],
  autoescola: ['["amenity"="driving_school"]'],

  // serviços profissionais
  advogado: ['["office"="lawyer"]'],
  "escritorio de advocacia": ['["office"="lawyer"]'],
  contador: ['["office"="accountant"]'],
  "escritorio de contabilidade": ['["office"="accountant"]'],
  imobiliaria: ['["office"="estate_agent"]'],
  "corretor de imoveis": ['["office"="estate_agent"]'],
  "corretor de seguros": ['["office"="insurance"]'],
  arquiteto: ['["office"="architect"]'],
  "escritorio de arquitetura": ['["office"="architect"]'],
  engenheiro: ['["office"="engineer"]'],
  "agencia de viagens": ['["shop"="travel_agency"]'],
  "agencia de publicidade": ['["office"="advertising_agency"]', '["office"]["name"~"publicidade|marketing|agencia",i]'],
  "despachante": ['["office"="government"]', '["office"]["name"~"despachante",i]'],
  cartorio: ['["office"="notary"]', '["office"]["name"~"cartorio|tabeliao|registro civil",i]'],

  // varejo
  "loja de roupas": ['["shop"="clothes"]'],
  "loja de calcados": ['["shop"="shoes"]'],
  "loja de moveis": ['["shop"="furniture"]'],
  "loja de celular": ['["shop"="mobile_phone"]'],
  "assistencia tecnica": ['["shop"~"mobile_phone|electronics|computer"]', '["craft"="electronics_repair"]', '["shop"]["name"~"assistencia tecnica",i]'],
  "loja de informatica": ['["shop"="computer"]'],
  "loja de eletrodomesticos": ['["shop"~"electronics|appliance"]'],
  "loja de brinquedos": ['["shop"="toys"]'],
  "loja de bicicletas": ['["shop"="bicycle"]'],
  "loja de presentes": ['["shop"~"gift|variety_store"]'],
  "loja de cosmeticos": ['["shop"~"cosmetics|chemist"]'],
  perfumaria: ['["shop"~"perfumery|cosmetics"]'],
  joalheria: ['["shop"="jewelry"]'],
  relojoaria: ['["shop"~"watches|jewelry"]', '["craft"="watchmaker"]'],
  papelaria: ['["shop"="stationery"]'],
  livraria: ['["shop"="books"]'],
  "loja de material de construcao": ['["shop"~"doityourself|hardware|trade"]', '["shop"]["name"~"material de construcao|construcao",i]'],
  "loja de tintas": ['["shop"="paint"]'],
  "loja de ferragens": ['["shop"="hardware"]'],
  floricultura: ['["shop"="florist"]'],
  tabacaria: ['["shop"="tobacco"]'],
  "loja de departamentos": ['["shop"="department_store"]'],
  "armarinho": ['["shop"~"fabric|sewing|haberdashery"]', '["shop"]["name"~"armarinho|aviamento",i]'],

  // ofícios e serviços
  grafica: ['["shop"="copyshop"]', '["craft"="printer"]', '["shop"]["name"~"grafica|impressao",i]'],
  vidracaria: ['["craft"="glaziery"]', '["craft"]["name"~"vidracaria|vidros",i]'],
  marcenaria: ['["craft"="carpenter"]', '["craft"]["name"~"marcenaria|marceneiro",i]'],
  serralheria: ['["craft"~"blacksmith|metal_construction"]', '["craft"]["name"~"serralheria|serralheiro",i]'],
  eletricista: ['["craft"="electrician"]'],
  encanador: ['["craft"="plumber"]'],
  chaveiro: ['["shop"="locksmith"]', '["craft"="key_cutter"]', '["shop"]["name"~"chaveiro",i]'],
  costureira: ['["craft"="tailor"]', '["shop"="tailor"]', '["craft"]["name"~"costureira|ajuste de roupa|conserto de roupa",i]'],
  lavanderia: ['["shop"="laundry"]'],
  "dedetizadora": ['["craft"="pest_control"]', '["craft"]["name"~"dedetiza|controle de pragas",i]'],

  // hospedagem
  hotel: ['["tourism"="hotel"]'],
  pousada: ['["tourism"~"guest_house|hotel"]', '["tourism"]["name"~"pousada",i]'],
  motel: ['["tourism"="motel"]', '["tourism"]["name"~"motel",i]'],
  hostel: ['["tourism"="hostel"]'],

  // educação
  escola: ['["amenity"="school"]'],
  "escola de idiomas": ['["amenity"="language_school"]'],
  "escola de musica": ['["amenity"="music_school"]', '["amenity"]["name"~"escola de musica",i]'],
  creche: ['["amenity"="kindergarten"]'],
  faculdade: ['["amenity"~"college|university"]'],
  "curso profissionalizante": ['["amenity"="training"]', '["office"="educational_institution"]'],
  "auto escola": ['["amenity"="driving_school"]'],
  // Nota: para não sobrecarregar o Overpass, as categorias abaixo priorizam
  // tags estruturadas (shop=, craft=, office=...). Regex de nome só aparece
  // preso a uma tag ('["shop"="x"]["name"~"y"]') ou, em último caso, sozinho e
  // curto (2-3 alternativas) para categorias sem cobertura no OSM.
  "reforco escolar": ['["amenity"~"school|training"]["name"~"reforco|kumon|particular",i]'],
  cursinho: ['["amenity"~"school|college|training"]["name"~"cursinho|vestibular|enem",i]'],
  "escola de informatica": ['["amenity"~"school|training"]["name"~"informatica|informática",i]'],
  "escola de danca": ['["leisure"="dance"]'],
  "escola de natacao": ['["leisure"="sports_centre"]["sport"~"swimming"]'],

  // comida (mais)
  marmitaria: ['["amenity"~"restaurant|fast_food"]["name"~"marmita|self.?service|prato feito",i]'],
  pastelaria: [
    '["amenity"~"restaurant|fast_food"]["cuisine"~"pastel"]',
    '["amenity"~"restaurant|fast_food"]["name"~"pastel|pastelaria",i]',
  ],
  salgaderia: ['["shop"~"bakery|pastry"]["name"~"salgad|coxinha",i]'],
  "restaurante vegetariano": [
    '["amenity"="restaurant"]["cuisine"~"vegetarian|vegan"]',
    '["amenity"="restaurant"]["diet:vegetarian"~"yes|only"]',
  ],
  emporio: ['["shop"~"deli|health_food"]', '["shop"="convenience"]["name"~"emporio|empório",i]'],
  "casa de bolos": ['["shop"~"bakery|pastry|confectionery"]["name"~"bolo|bolos",i]'],
  espetinho: ['["amenity"~"restaurant|fast_food|bar"]["name"~"espetinho|espeto|espetaria",i]'],
  "loja de doces": ['["shop"~"confectionery|chocolate"]'],

  // beleza, estética e bem-estar (mais)
  depilacao: ['["shop"="beauty"]["name"~"depila|cera|waxing",i]'],
  "design de sobrancelhas": ['["shop"="beauty"]["name"~"sobrancelha|lash|cilios|micropigment",i]'],
  "clinica de podologia": ['["healthcare"="podiatrist"]', '["shop"="beauty"]["name"~"podolog",i]'],
  massoterapia: ['["shop"="massage"]', '["leisure"="spa"]'],
  "estudio de tatuagem": ['["shop"="tattoo"]'],
  "estudio de yoga": ['["leisure"~"fitness_centre|sports_centre"]["name"~"yoga|ioga",i]'],

  // saúde (mais)
  "loja de produtos ortopedicos": ['["shop"~"medical_supply|mobility"]'],
  "loja de aparelhos auditivos": ['["shop"="hearing_aids"]'],
  "farmacia de manipulacao": ['["amenity"="pharmacy"]["name"~"manipula|formula|homeopat",i]'],
  "laboratorio de protese dentaria": ['["craft"="dental_technician"]'],
  "clinica de vacinacao": ['["healthcare"="vaccination_centre"]'],

  // pet (mais)
  "casa de racao": ['["shop"="agrarian"]', '["shop"="pet"]["name"~"racao|ração",i]'],
  agropecuaria: ['["shop"="agrarian"]'],
  "hotel para caes": ['["amenity"="animal_boarding"]', '["shop"="pet"]["name"~"hotel|creche|day.?care",i]'],
  adestrador: ['["name"~"adestramento|adestrador",i]'],

  // automotivo (mais)
  "oficina de motos": [
    '["shop"~"motorcycle_repair|motorcycle"]',
    '["shop"="car_repair"]["name"~"moto",i]',
  ],
  "loja de som automotivo": ['["shop"="car_parts"]["name"~"som|insulfilm|pelicula|multimidia",i]'],
  "loja de baterias": ['["shop"="car_parts"]["name"~"bateria|baterias|moura|heliar",i]'],
  "estetica automotiva": [
    '["amenity"="car_wash"]',
    '["shop"="car_repair"]["name"~"estetica|polimento|higieniza",i]',
  ],
  "envelopamento automotivo": ['["shop"="car_repair"]["name"~"envelopamento|adesivagem|plotagem",i]'],
  guincho: ['["name"~"guincho|reboque|auto socorro",i]'],
  "locadora de veiculos": ['["amenity"="car_rental"]'],

  // varejo (mais)
  sapataria: ['["shop"="shoe_repair"]', '["craft"="shoemaker"]'],
  brecho: ['["shop"~"second_hand|charity"]'],
  "loja de artigos esportivos": ['["shop"="sports"]'],
  "loja de surf e skate": ['["shop"="surf"]', '["shop"="sports"]["name"~"surf|skate",i]'],
  "loja de bolsas e acessorios": ['["shop"~"bag|fashion_accessories|leather"]'],
  lingerie: [
    '["shop"="clothes"]["clothes"~"underwear|lingerie"]',
    '["shop"="clothes"]["name"~"lingerie|moda intima|íntima",i]',
  ],
  "loja infantil": ['["shop"="baby_goods"]', '["shop"="toys"]'],
  "loja de games": ['["shop"="video_games"]'],
  "loja de instrumentos musicais": ['["shop"="musical_instrument"]'],
  "loja de artesanato": ['["shop"~"craft|art"]'],
  "loja de tecidos": ['["shop"~"fabric|sewing"]'],
  "loja de festas": ['["shop"="party"]'],
  "loja de noivas": ['["shop"="wedding"]', '["shop"="clothes"]["name"~"noiva|noivas",i]'],
  "loja de bijuterias": ['["shop"="jewelry"]["name"~"bijuteria|bijoux|semi.?joia|prata",i]'],
  "loja de colchoes": ['["shop"="bed"]'],
  "loja de cortinas": ['["shop"="curtain"]'],
  "loja de iluminacao": ['["shop"="lighting"]'],
  "loja de decoracao": ['["shop"="interior_decoration"]'],
  "loja de utilidades domesticas": ['["shop"="houseware"]'],
  bazar: ['["shop"="variety_store"]'],
  "loja de eletronicos": ['["shop"~"electronics|hifi"]'],
  "loja de cameras e seguranca": ['["shop"="electronics"]["name"~"cftv|camera|monitoramento|alarme",i]'],
  "loja de material eletrico": ['["shop"="electrical"]', '["shop"~"trade|hardware"]["name"~"eletric|elétric",i]'],
  "loja de ferramentas": ['["shop"~"hardware|trade|doityourself"]["name"~"ferramenta|makita|bosch",i]'],
  "loja de pisos e revestimentos": ['["shop"="tile"]', '["shop"~"trade|doityourself"]["name"~"piso|porcelanato|revestimento|azulejo",i]'],
  marmoraria: ['["craft"="stonemason"]', '["shop"="trade"]["name"~"marmore|mármore|granito|marmoraria",i]'],
  "loja de material de limpeza": ['["shop"="chemist"]', '["shop"="convenience"]["name"~"produtos de limpeza|material de limpeza",i]'],
  "loja de embalagens": ['["shop"="trade"]["name"~"embalagen|descartav",i]'],
  "loja de pesca": ['["shop"="fishing"]'],
  "loja de armas": ['["shop"~"weapons|hunting"]'],
  "artigos religiosos": ['["shop"="religion"]'],
  "loja de vinil": ['["shop"="music"]'],
  funeraria: ['["shop"="funeral_directors"]', '["office"="funeral_directors"]'],

  // serviços profissionais e tech (mais)
  "agencia de marketing digital": [
    '["office"~"it|advertising_agency"]',
    '["shop"="web_design"]',
  ],
  "desenvolvedor de software": ['["office"="it"]'],
  coworking: ['["amenity"="coworking_space"]', '["office"="coworking"]'],
  consultoria: ['["office"="consulting"]'],
  "correspondente bancario": [
    '["office"~"financial|financial_advisor"]',
    '["office"="company"]["name"~"credito|crédito|emprestimo|consorcio|consórcio",i]',
  ],
  "escritorio de traducao": ['["office"~"lawyer|company"]["name"~"traducao|tradução|tradutor|juramentad",i]'],
  "estudio de fotografia": ['["shop"="photo"]', '["craft"="photographer"]'],
  "assessoria contabil": ['["office"="accountant"]'],

  // construção, reformas e ofícios (mais)
  construtora: [
    '["office"="construction_company"]',
    '["craft"="builder"]',
    '["office"="company"]["name"~"construtora|construcoes|construções|empreiteira|incorporadora",i]',
  ],
  "empresa de reformas": ['["craft"~"builder|plasterer|tiler"]'],
  "pintor predial": ['["craft"="painter"]'],
  tapecaria: ['["craft"="upholsterer"]', '["shop"="furniture"]["name"~"tape|estofa",i]'],
  "ar condicionado": [
    '["craft"="hvac"]',
    '["shop"~"electronics|appliance|trade"]["name"~"ar.?condicionado|refrigera|climatiza|split",i]',
  ],
  "assistencia de eletrodomesticos": [
    '["craft"="electronics_repair"]',
    '["shop"="appliance"]["name"~"conserto|assist",i]',
  ],
  "gesso e drywall": ['["craft"="plasterer"]', '["craft"]["name"~"gesso|drywall|gesseiro",i]'],
  desentupidora: ['["craft"~"plumber|pest_control"]["name"~"desentup",i]', '["craft"]["name"~"desentupidora|limpa fossa",i]'],
  "empresa de jardinagem": ['["shop"="garden_centre"]', '["craft"="gardener"]'],
  "empresa de limpeza": ['["office"="company"]["name"~"servicos de limpeza|conservacao e limpeza|higieniza",i]'],
  "comunicacao visual": [
    '["craft"~"sign_maker|painter"]',
    '["shop"="copyshop"]["name"~"comunica|letreiro|fachada|adesiv",i]',
  ],
  serigrafia: ['["shop"="copyshop"]["name"~"serigrafia|estamparia|silk|personalizado|brinde|bordado",i]'],
  "montador de moveis": ['["name"~"montador|montagem de moveis|montagem de móveis",i]'],

  // eventos e hospedagem (mais)
  "espaco de eventos": ['["amenity"="events_venue"]'],
  "buffet infantil": ['["amenity"~"events_venue|restaurant"]["name"~"buffet|festa infantil|festas infantis",i]'],
  camping: ['["tourism"="camp_site"]'],
  "casa de repouso": [
    '["amenity"="nursing_home"]',
    '["social_facility"~"nursing_home|assisted_living"]',
  ],
};

/** Deixa o regex de nome tolerante a acento: "acougue" casa com "Açougue". */
function regexTolerante(termo: string): string {
  const acentos: Record<string, string> = {
    a: "[aáàâã]",
    e: "[eéèê]",
    i: "[ií]",
    o: "[oóòôõ]",
    u: "[uú]",
    c: "[cç]",
  };
  return termo
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .split("")
    .map((ch) => acentos[ch] || ch)
    .join("");
}

/**
 * Resolve os filtros Overpass para um tipo de negócio.
 * `matched` = achou uma categoria conhecida; se `false`, caiu na busca por nome.
 */
export function resolveOsmFilters(tipoBruto: string): { filters: string[]; matched: boolean } {
  const tipo = normalizar(tipoBruto);
  if (!tipo) return { filters: [], matched: false };

  if (MAPA[tipo]) return { filters: MAPA[tipo], matched: true };

  // chave conhecida contida no texto digitado (ex.: "loja de roupas femininas")
  let melhor = "";
  for (const chave of Object.keys(MAPA)) {
    if (tipo.includes(chave) && chave.length > melhor.length) melhor = chave;
  }
  if (melhor) return { filters: MAPA[melhor], matched: true };

  // fallback: procura pelo nome do estabelecimento
  return { filters: [`["name"~"${regexTolerante(tipo)}",i]`], matched: false };
}
