/**
 * Adapter Registry
 *
 * Manages registered system adapters and provides adapter lookup by system ID.
 * This is the extension point for adding future system adapters (PF2E, 5E, etc.).
 *
 * Usage:
 *   AdapterRegistry.register(new PathfinderAdapter());
 *   const adapter = AdapterRegistry.get("pf2e");
 */

import type { ISystemAdapter } from "./system-adapter.interface.js";
import { ModuleLogger } from "../utils/logger.js";

export class AdapterRegistry {
  private static readonly adapters = new Map<string, ISystemAdapter>();

  /**
   * Registers an adapter for a system. Overwrites any previously registered
   * adapter for the same system ID — useful for hot-reloading during development.
   */
  static register(adapter: ISystemAdapter): void {
    const { systemId, systemName } = adapter.info;
    if (this.adapters.has(systemId)) {
      ModuleLogger.warn(`[AdapterRegistry] Overwriting existing adapter for system '${systemId}'.`);
    }
    this.adapters.set(systemId, adapter);
    ModuleLogger.info(`[AdapterRegistry] Registered adapter for ${systemName} (${systemId}).`);
  }

  /**
   * Retrieves the adapter for a given system ID.
   * @param systemId Foundry system ID (e.g. "sfrpg")
   * @returns The adapter, or undefined if none is registered.
   */
  static get(systemId: string): ISystemAdapter | undefined {
    return this.adapters.get(systemId);
  }

  /**
   * Returns the adapter for a system ID, throwing if none is found.
   * @param systemId Foundry system ID
   * @throws Error if no adapter is registered for the given system.
   */
  static getOrThrow(systemId: string): ISystemAdapter {
    const adapter = this.adapters.get(systemId);
    if (!adapter) {
      throw new Error(
        `[AdapterRegistry] No adapter registered for system '${systemId}'. ` +
        `Registered adapters: ${[...this.adapters.keys()].join(", ") || "none"}`
      );
    }
    return adapter;
  }

  /**
   * Returns the adapter for the currently active Foundry system.
   * Falls back gracefully if no adapter is available.
   */
  static getForCurrentSystem(): ISystemAdapter | undefined {
    const systemId = typeof game !== "undefined" ? game.system?.id : undefined;
    if (!systemId) return undefined;
    return this.adapters.get(systemId);
  }

  /** Returns all registered system IDs. */
  static getRegisteredSystemIds(): string[] {
    return [...this.adapters.keys()];
  }

  /** Returns true if an adapter is registered for the given system. */
  static has(systemId: string): boolean {
    return this.adapters.has(systemId);
  }

  /** Removes all registered adapters (useful for testing). */
  static clear(): void {
    this.adapters.clear();
  }
}
