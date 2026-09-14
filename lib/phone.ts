/**
 * Converte um telefone nacional (ex: "(11) 91234-5678") em um link wa.me
 * com a mensagem já preenchida. Assume Brasil (DDI 55).
 */
export function toWhatsAppLink(nationalPhoneNumber: string | undefined | null, message: string): string | null {
  if (!nationalPhoneNumber) return null;
  const digits = nationalPhoneNumber.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
