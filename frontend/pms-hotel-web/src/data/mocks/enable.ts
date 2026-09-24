import { getPublicEnvironment } from "@/lib/env";

let startup: Promise<void> | undefined;

export async function enableMocking(): Promise<void> {
  if (typeof window === "undefined" || !getPublicEnvironment().useMockApi) {
    return;
  }

  startup ??= import("./browser").then(async ({ mockWorker }) => {
    await mockWorker.start({ onUnhandledRequest: "bypass" });
  }).catch(error => { startup = undefined; throw error; });
  await startup;
}
