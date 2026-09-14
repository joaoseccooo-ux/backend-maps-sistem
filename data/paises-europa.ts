/**
 * Países europeus comuns pra prospecção. "codigo" é o ISO 3166-1 alpha-2
 * usado no "countrycodes" da Nominatim, pra restringir a busca ao país
 * certo (evita ambiguidade com cidade de mesmo nome em outro lugar).
 */
export const PAISES_EUROPA = [
  { nome: "Portugal", codigo: "pt" },
  { nome: "Espanha", codigo: "es" },
  { nome: "França", codigo: "fr" },
  { nome: "Itália", codigo: "it" },
  { nome: "Alemanha", codigo: "de" },
  { nome: "Reino Unido", codigo: "gb" },
  { nome: "Irlanda", codigo: "ie" },
  { nome: "Países Baixos", codigo: "nl" },
  { nome: "Bélgica", codigo: "be" },
  { nome: "Suíça", codigo: "ch" },
  { nome: "Áustria", codigo: "at" },
  { nome: "Suécia", codigo: "se" },
  { nome: "Noruega", codigo: "no" },
  { nome: "Dinamarca", codigo: "dk" },
  { nome: "Finlândia", codigo: "fi" },
  { nome: "Polônia", codigo: "pl" },
  { nome: "República Tcheca", codigo: "cz" },
  { nome: "Hungria", codigo: "hu" },
  { nome: "Grécia", codigo: "gr" },
  { nome: "Romênia", codigo: "ro" },
] as const;

export function codigoPais(nome: string): string | undefined {
  return PAISES_EUROPA.find((p) => p.nome === nome)?.codigo;
}
