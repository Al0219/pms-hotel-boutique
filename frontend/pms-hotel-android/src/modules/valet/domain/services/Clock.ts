export interface Clock {
  getNow(): Date;
}

/** Device clock used only for immediate frontend UX validation. */
export const deviceClock: Clock = {
  getNow: () => new Date(),
};
