import { getPublicEnvironment } from "@/lib/env";

let workerPromise: Promise<void> | null = null;

export async function enableMocking(): Promise<void> {
  if (typeof window === "undefined" || !getPublicEnvironment().useMockApi) return;
  workerPromise ??= (async () => {
    const { mockWorker } = await import("./browser");
    await mockWorker.start({ onUnhandledRequest: "bypass" });
  })().catch(error => {
    workerPromise = null;
    throw error;
  });
  await workerPromise;
}
