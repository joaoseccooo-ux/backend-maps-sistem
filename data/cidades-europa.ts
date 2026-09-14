/**
 * Cidades principais por país europeu, pra popular o select de cidade na
 * busca internacional — sem isso o usuário precisaria saber de cor o nome
 * de uma cidade lá fora. Não é exaustivo (não existe um "IBGE" europeu):
 * cobre capital + principais cidades de cada país, que é onde tem mais
 * negócio pra prospectar de qualquer forma. Chaves batem com o "nome" de
 * data/paises-europa.ts.
 */
export const CIDADES_EUROPA: Record<string, string[]> = {
  Portugal: [
    "Lisboa", "Porto", "Braga", "Coimbra", "Faro", "Setúbal", "Aveiro",
    "Évora", "Viseu", "Leiria", "Guimarães", "Funchal", "Ponta Delgada",
    "Viana do Castelo", "Portimão",
  ],
  Espanha: [
    "Madrid", "Barcelona", "Valência", "Sevilha", "Saragoça", "Málaga",
    "Múrcia", "Palma de Maiorca", "Bilbao", "Alicante", "Córdoba",
    "Valladolid", "Vigo", "Gijón", "San Sebastián", "Granada", "Toledo",
    "Salamanca",
  ],
  França: [
    "Paris", "Marselha", "Lyon", "Toulouse", "Nice", "Nantes", "Estrasburgo",
    "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Toulon",
    "Grenoble", "Dijon", "Angers", "Nîmes", "Le Havre",
  ],
  Itália: [
    "Roma", "Milão", "Nápoles", "Turim", "Palermo", "Gênova", "Bolonha",
    "Florença", "Bari", "Catânia", "Veneza", "Verona", "Messina", "Pádua",
    "Trieste", "Brescia", "Parma", "Modena",
  ],
  Alemanha: [
    "Berlim", "Hamburgo", "Munique", "Colônia", "Frankfurt", "Stuttgart",
    "Düsseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
    "Hannover", "Nuremberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld",
  ],
  "Reino Unido": [
    "Londres", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds",
    "Sheffield", "Edimburgo", "Bristol", "Cardiff", "Belfast", "Leicester",
    "Coventry", "Nottingham", "Newcastle", "Southampton",
  ],
  Irlanda: ["Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Kilkenny", "Sligo"],
  "Países Baixos": [
    "Amesterdã", "Roterdã", "Haia", "Utrecht", "Eindhoven", "Tilburg",
    "Groningen", "Almere", "Breda", "Nijmegen", "Haarlem", "Arnhem",
  ],
  Bélgica: ["Bruxelas", "Antuérpia", "Ghent", "Charleroi", "Liège", "Bruges", "Namur", "Leuven", "Mons"],
  Suíça: ["Zurique", "Genebra", "Basel", "Berna", "Lausanne", "Lucerna", "St. Gallen", "Lugano"],
  Áustria: ["Viena", "Graz", "Linz", "Salzburgo", "Innsbruck", "Klagenfurt"],
  Suécia: ["Estocolmo", "Gotemburgo", "Malmö", "Uppsala", "Örebro", "Linköping"],
  Noruega: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Tromsø"],
  Dinamarca: ["Copenhague", "Aarhus", "Odense", "Aalborg", "Esbjerg"],
  Finlândia: ["Helsinque", "Espoo", "Tampere", "Vantaa", "Turku", "Oulu"],
  Polônia: [
    "Varsóvia", "Cracóvia", "Łódź", "Wrocław", "Poznań", "Gdańsk",
    "Szczecin", "Bydgoszcz", "Lublin", "Katowice",
  ],
  "República Tcheca": ["Praga", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc"],
  Hungria: ["Budapeste", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr"],
  Grécia: ["Atenas", "Salônica", "Patras", "Heraklion", "Larissa", "Volos"],
  Romênia: ["Bucareste", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Craiova", "Brașov"],
};
