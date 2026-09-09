import { getPublicEnvironment } from "@/lib/env";

export async function enableMocking(): Promise<void> {
  if (typeof window === "undefined" || !getPublicEnvironment().useMockApi) {
    return;
  }

  const { mockWorker } = await import("./browser");
  await mockWorker.start({ onUnhandledRequest: "bypass" });
}
