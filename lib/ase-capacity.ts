import { ASE_TARGET_ACCOUNTS } from "./constants.ts";

export interface AseCapacity {
  aseCount: number;
  capacity: number;
  active: number;
  /** Negative when the team is over capacity. */
  open: number;
}

/** Open capacity = (ASE count x target accounts per ASE) - active accounts. */
export function aseCapacity(aseCount: number, active: number, target = ASE_TARGET_ACCOUNTS): AseCapacity {
  const capacity = aseCount * target;
  return { aseCount, capacity, active, open: capacity - active };
}
