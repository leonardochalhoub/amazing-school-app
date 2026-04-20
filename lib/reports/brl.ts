/**
 * BRL formatting + "valor por extenso" (amount-in-words) used on
 * Brazilian receipts. The spelled-out amount is required on a
 * recibo for it to be legally compliant / dispute-proof.
 */

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const UNITS = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest < 20 && rest > 0) parts.push(UNITS[rest]);
  else if (rest >= 20) {
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
  }
  return parts.join(" e ");
}

function integerByExtenso(n: number): string {
  if (n === 0) return "zero";
  if (n < 1000) return belowThousand(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const thousandsPart =
    thousands === 1 ? "mil" : `${belowThousand(thousands)} mil`;
  if (rest === 0) return thousandsPart;
  // Between thousand-part and rest, use "e" only when rest < 100 or
  // rest is a round hundred — the canonical PT-BR rule.
  const connector = rest < 100 || rest % 100 === 0 ? " e " : ", ";
  return `${thousandsPart}${connector}${belowThousand(rest)}`;
}

/**
 * "R$ 1.250,50" → "mil duzentos e cinquenta reais e cinquenta centavos"
 * Accepts an integer value in CENTS (the shape used across the DB).
 */
export function amountInWordsBRL(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const reaisWord =
    reais === 0
      ? "zero reais"
      : reais === 1
        ? "um real"
        : `${integerByExtenso(reais)} reais`;
  if (centavos === 0) return reaisWord;
  const centavosWord =
    centavos === 1 ? "um centavo" : `${integerByExtenso(centavos)} centavos`;
  return `${reaisWord} e ${centavosWord}`;
}
