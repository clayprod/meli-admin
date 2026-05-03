import { describe, expect, it } from "vitest";

import { calculateSimplesEffectiveRate } from "@/lib/tax/simples-nacional";

describe("calculateSimplesEffectiveRate", () => {
  it("primeira faixa retorna a aliquota nominal", () => {
    const r = calculateSimplesEffectiveRate(120_000, "I");
    expect(r.bracketIndex).toBe(0);
    expect(r.nominalRate).toBe(0.04);
    expect(r.effectiveRate).toBeCloseTo(0.04, 6);
  });

  it("segunda faixa aplica deducao", () => {
    const r = calculateSimplesEffectiveRate(300_000, "I");
    expect(r.bracketIndex).toBe(1);
    const expected = (300_000 * 0.073 - 5_940) / 300_000;
    expect(r.effectiveRate).toBeCloseTo(expected, 6);
  });

  it("terceira faixa", () => {
    const r = calculateSimplesEffectiveRate(600_000, "I");
    expect(r.bracketIndex).toBe(2);
    const expected = (600_000 * 0.095 - 13_860) / 600_000;
    expect(r.effectiveRate).toBeCloseTo(expected, 6);
  });

  it("topo do simples (4.8M) ainda retorna alguma aliquota", () => {
    const r = calculateSimplesEffectiveRate(4_800_000, "I");
    expect(r.bracketIndex).toBe(5);
    expect(r.exceedsCeiling).toBe(false);
  });

  it("acima de 4.8M sinaliza exceedsCeiling", () => {
    const r = calculateSimplesEffectiveRate(5_000_000, "I");
    expect(r.exceedsCeiling).toBe(true);
  });

  it("rbt12 zero usa primeira faixa nominal", () => {
    const r = calculateSimplesEffectiveRate(0, "I");
    expect(r.effectiveRate).toBe(0.04);
  });

  it("rejeita valor negativo", () => {
    expect(() => calculateSimplesEffectiveRate(-1, "I")).toThrow();
  });
});
