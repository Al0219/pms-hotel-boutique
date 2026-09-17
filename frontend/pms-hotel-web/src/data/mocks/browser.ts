import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";
import { reservationHandlers } from "./reservation-handlers";

export const mockWorker = setupWorker(...handlers, ...reservationHandlers);
