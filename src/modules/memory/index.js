/**
 * Public integration surface for the Dynamic Memory Tree / Memory Vault module.
 *
 * The parent MEDHA app imports from this file. Everything the module exposes
 * is listed here so the module can be dropped into the real app unchanged.
 */

export { default } from "./MemoryAssistant.jsx";
export { default as MemoryAssistant } from "./MemoryAssistant.jsx";
export { memoryService, MemoryService } from "./services/memoryService.js";
export {
  MemoryRepository,
  MockMemoryRepository,
} from "./services/memoryRepository.js";
export {
  buildTree,
  getCategoryPath,
  collectDescendantIds,
} from "./services/memoryTreeBuilder.js";
export { seedNodes, seedPatients } from "./data/seedData.js";

// Node type constants
export const NODE_TYPES = {
  ROOT: "root",
  CATEGORY: "category",
  MEMORY: "memory",
};

// Convenience re-export of the game-items accessor.
export const getMemoryGameItems = (patientId, options) =>
  memoryService.getMemoryGameItems(patientId, options);
