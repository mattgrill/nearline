export { findDuplicates, DuplicateFinder } from "./finder";
export type { ClientDuplicateFinderOptions } from "./finder";

// Re-export core types for convenience
export type {
  DuplicateFinderOptions,
  DuplicatePair,
  DuplicateGroup,
  FindDuplicatesResult,
  FindDuplicatesStats,
} from "@mattgrill/nearline-core";
