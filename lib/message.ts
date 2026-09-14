/**
 * Templates de mensagem persuasiva oferecendo criação/melhoria de site.
 * `seuNome` é opcional — se vazio, usa um texto genérico.
 */

export function buildWhatsAppMessage(nomeNegocio: string, temSite: boolean, seuNome: string): string {
  const intro = seuNome.trim() ? `Meu nome é ${seuNome.trim()}. ` : "";

  if (!temSite) {
    return `Olá! Tudo bem? ${intro}Vi o perfil de ${nomeNegocio} no Google e percebi que vocês ainda não têm um site. Eu crio sites profissionais e rápidos para negócios locais, pensados para atrair mais clientes pelo Google e pelas redes sociais. Posso te mostrar uma proposta rápida, sem compromisso?`;
  }

  return `Olá! Tudo bem? ${intro}Vi o perfil de ${nomeNegocio} no Google. Trabalho criando e modernizando sites com foco em atrair mais clientes para negócios locais. Se fizer sentido, posso dar uma olhada rápida no site de vocês e trazer algumas ideias, sem compromisso. Podemos conversar?`;
}

export function buildEmailSubject(nomeNegocio: string): string {
  return `Site profissional para ${nomeNegocio}`;
}

export function buildEmailBody(nomeNegocio: string, temSite: boolean, seuNome: string): string {
  const assinatura = seuNome.trim() || "[seu nome]";

  if (!temSite) {
    return `Olá!\n\nMeu nome é ${assinatura} e vi o perfil de ${nomeNegocio} no Google. Notei que o negócio ainda não tem um site — hoje isso faz bastante diferença para atrair e passar confiança para novos clientes.\n\nCrio sites rápidos e com foco em conversão para negócios locais. Se fizer sentido, posso enviar uma proposta simples, sem compromisso.\n\nFico à disposição!\n\n${assinatura}`;
  }

  return `Olá!\n\nMeu nome é ${assinatura} e vi o perfil de ${nomeNegocio} no Google. Trabalho criando e modernizando sites com foco em atrair mais clientes para negócios locais.\n\nSe fizer sentido, posso dar uma olhada no site de vocês e sugerir algumas melhorias rápidas, sem compromisso.\n\nFico à disposição!\n\n${assinatura}`;
}
