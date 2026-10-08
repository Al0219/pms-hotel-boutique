import { getPublicEnvironment } from "@/lib/env";
import { httpRequest } from "@/lib/http/client";

import type { RewardsProgramDTO } from "../dtos/rewards.dto";

/** PROVISIONAL endpoint for rewards program status */
export function getRewardsProgram(accountId: string, signal?: AbortSignal): Promise<RewardsProgramDTO> {
  return httpRequest<RewardsProgramDTO>({ baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined, path: `/rewards?accountId=${encodeURIComponent(accountId)}`, signal });
}
