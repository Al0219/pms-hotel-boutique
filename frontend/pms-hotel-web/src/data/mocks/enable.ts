import { getPublicEnvironment } from "@/lib/env";

let mockWorkerPromise: Promise<void> | null = null;

export async function enableMocking(): Promise<void> {
  if (typeof window === "undefined" || !getPublicEnvironment().useMockApi) {
    return;
  }

  mockWorkerPromise ??= (async () => {
    const { mockWorker } = await import("./browser");
    await mockWorker.start({ onUnhandledRequest: "bypass" });
  })();

  await mockWorkerPromise;
}
