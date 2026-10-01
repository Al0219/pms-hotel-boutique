import { RevenueDashboard } from "@/modules/revenue";

export const metadata = {
  title: "Revenue & Analytics | PMS Hotel Boutique",
  description: "Métricas e indicadores clave de rendimiento comercial, ADR, RevPAR, Pickup y Pace",
};

export default function Page() {
  return <RevenueDashboard propertyId="prop_boutique_01" />;
}
