"use client";

import { RebookingEvaluate, type MultiPropertyView } from "@/modules/multi-property";
import { useRouter } from "next/navigation";

export default function RebookingEvaluateRoute() {
  const router = useRouter();

  const handleNavigate = (view: MultiPropertyView) => {
    const routes: Record<MultiPropertyView, string> = {
      dashboard: "/multi-property",
      search: "/multi-property/disponibilidad/buscar",
      results: "/multi-property/disponibilidad/resultados",
      evaluate: "/multi-property/rebooking/evaluar",
      applied: "/multi-property/rebooking/aplicado"
    };
    router.push(routes[view]);
  };

  return <RebookingEvaluate onNavigate={handleNavigate} />;
}
