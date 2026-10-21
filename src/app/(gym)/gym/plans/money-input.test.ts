import { describe, expect, it } from "vitest"
import { moneyDigits, moneyDisplay } from "./money-input"

describe("Máscara monetária dos planos", () => {
  it("converte valores mascarados em centavos sem arredondamento", () => {
    expect(moneyDigits("R$ 149,90")).toBe("14990")
    expect(Number(moneyDigits("0,01"))).toBe(1)
    expect(moneyDisplay("14990")).toBe("149,90")
    expect(moneyDisplay("1")).toBe("0,01")
  })

  it("limita a seis dígitos e formata o maior valor permitido", () => {
    expect(moneyDigits("9999999")).toBe("999999")
    expect(moneyDisplay("999999")).toBe("9.999,99")
    expect(moneyDigits(moneyDisplay("999999"))).toBe("999999")
  })

  it("remove letras e símbolos sem permitir valores negativos", () => {
    expect(moneyDigits("abc!@#$%" )).toBe("")
    expect(moneyDigits("-123,45")).toBe("12345")
    expect(moneyDigits("abc12!@3")).toBe("123")
  })

  it("permite limpar o campo e digitar após o zero inicial", () => {
    expect(moneyDisplay("")).toBe("")
    expect(moneyDisplay("0")).toBe("0,00")
    expect(moneyDigits("0,001")).toBe("1")
    expect(moneyDigits("0000014990")).toBe("14990")
  })
})
