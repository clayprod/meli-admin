export type SimplesAnexo = "I" | "II" | "III" | "IV" | "V";

type Bracket = {
  ceiling: number;
  nominalRate: number;
  deduction: number;
};

const ANEXO_I_BRACKETS: Bracket[] = [
  { ceiling: 180_000, nominalRate: 0.04, deduction: 0 },
  { ceiling: 360_000, nominalRate: 0.073, deduction: 5_940 },
  { ceiling: 720_000, nominalRate: 0.095, deduction: 13_860 },
  { ceiling: 1_800_000, nominalRate: 0.107, deduction: 22_500 },
  { ceiling: 3_600_000, nominalRate: 0.143, deduction: 87_300 },
  { ceiling: 4_800_000, nominalRate: 0.19, deduction: 378_000 },
];

const ANEXO_II_BRACKETS: Bracket[] = [
  { ceiling: 180_000, nominalRate: 0.045, deduction: 0 },
  { ceiling: 360_000, nominalRate: 0.078, deduction: 5_940 },
  { ceiling: 720_000, nominalRate: 0.1, deduction: 13_860 },
  { ceiling: 1_800_000, nominalRate: 0.112, deduction: 22_500 },
  { ceiling: 3_600_000, nominalRate: 0.147, deduction: 85_500 },
  { ceiling: 4_800_000, nominalRate: 0.3, deduction: 720_000 },
];

const ANEXO_III_BRACKETS: Bracket[] = [
  { ceiling: 180_000, nominalRate: 0.06, deduction: 0 },
  { ceiling: 360_000, nominalRate: 0.112, deduction: 9_360 },
  { ceiling: 720_000, nominalRate: 0.135, deduction: 17_640 },
  { ceiling: 1_800_000, nominalRate: 0.16, deduction: 35_640 },
  { ceiling: 3_600_000, nominalRate: 0.21, deduction: 125_640 },
  { ceiling: 4_800_000, nominalRate: 0.33, deduction: 648_000 },
];

const TABLES: Record<SimplesAnexo, Bracket[]> = {
  I: ANEXO_I_BRACKETS,
  II: ANEXO_II_BRACKETS,
  III: ANEXO_III_BRACKETS,
  IV: ANEXO_I_BRACKETS,
  V: ANEXO_I_BRACKETS,
};

export const SIMPLES_REVENUE_CEILING = 4_800_000;

export type SimplesEffectiveRate = {
  rbt12: number;
  anexo: SimplesAnexo;
  bracketIndex: number;
  nominalRate: number;
  deduction: number;
  effectiveRate: number;
  exceedsCeiling: boolean;
};

export function calculateSimplesEffectiveRate(
  rbt12: number,
  anexo: SimplesAnexo = "I",
): SimplesEffectiveRate {
  if (!Number.isFinite(rbt12) || rbt12 < 0) {
    throw new Error("RBT12 precisa ser um numero >= 0.");
  }

  const table = TABLES[anexo];
  const exceedsCeiling = rbt12 > SIMPLES_REVENUE_CEILING;

  if (rbt12 === 0) {
    const first = table[0];
    return {
      rbt12,
      anexo,
      bracketIndex: 0,
      nominalRate: first.nominalRate,
      deduction: first.deduction,
      effectiveRate: first.nominalRate,
      exceedsCeiling: false,
    };
  }

  const idx = table.findIndex((b) => rbt12 <= b.ceiling);
  const bracketIndex = idx === -1 ? table.length - 1 : idx;
  const bracket = table[bracketIndex];
  const effective = (rbt12 * bracket.nominalRate - bracket.deduction) / rbt12;

  return {
    rbt12,
    anexo,
    bracketIndex,
    nominalRate: bracket.nominalRate,
    deduction: bracket.deduction,
    effectiveRate: Math.max(0, effective),
    exceedsCeiling,
  };
}

export function formatBracketLabel(idx: number): string {
  return `${idx + 1}ª faixa`;
}
