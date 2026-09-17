import { describe, expect, it } from "vitest";

import { mapPromotion } from "./promotions.mapper";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

describe("promotions.mapper", () => {
  it("maps valid PromotionDTO correctly", () => {
    const dto = {
      code: "MEMBER5",
      title: "Member Rate -5%",
      discount_percentage: 5,
      description: "Oferta directa para miembros Silver",
      is_eligible: true,
      conditions: "Sujeto a disponibilidad y fechas seleccionadas",
    };

    const domain = mapPromotion(dto);
    expect(domain.code).toBe("MEMBER5");
    expect(domain.discountPercentage).toBe(5);
    expect(domain.isEligible).toBe(true);
  });

  it("throws DomainMappingError when code is missing", () => {
    expect(() =>
      mapPromotion({
        code: "",
        title: "Member Rate",
      } as any)
    ).toThrow(DomainMappingError);
  });
});
