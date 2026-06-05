/**
 * Foundry VTT V13 global type augmentations.
 * Extends the global namespace with Foundry-specific APIs used by this module.
 * For full type coverage, consider installing @league-of-foundry-developers/foundry-vtt-types.
 */

declare global {
  // ---------------------------------------------------------------------------
  // Game object
  // ---------------------------------------------------------------------------
  const game: Game;

  interface Game {
    modules: Map<string, Module>;
    settings: ClientSettings;
    packs: Collection<CompendiumCollection>;
    user: User;
    users: Users;
    i18n: Localization;
    system: { id: string; version: string };
    ready: boolean;
    [key: string]: unknown;
  }

  interface Module {
    id: string;
    title: string;
    version: string;
    active: boolean;
    flags: Record<string, unknown>;
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  const ui: {
    notifications: Notifications;
    [key: string]: unknown;
  };

  interface Notifications {
    info(message: string, options?: { permanent?: boolean; console?: boolean }): void;
    warn(message: string, options?: { permanent?: boolean; console?: boolean }): void;
    error(message: string, options?: { permanent?: boolean; console?: boolean }): void;
  }

  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const Hooks: {
    on(hook: string, fn: (...args: unknown[]) => void): number;
    once(hook: string, fn: (...args: unknown[]) => void): number;
    off(hook: string, id: number): void;
    call(hook: string, ...args: unknown[]): boolean;
    callAll(hook: string, ...args: unknown[]): boolean;
  };

  // ---------------------------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------------------------
  const CONFIG: {
    Item: { documentClass: typeof Item };
    Actor: { documentClass: typeof Actor };
    JournalEntry: { documentClass: typeof JournalEntry };
    [key: string]: unknown;
  };

  // ---------------------------------------------------------------------------
  // foundry namespace (V13 API)
  // ---------------------------------------------------------------------------
  const foundry: {
    applications: {
      api: {
        ApplicationV2: typeof ApplicationV2Base;
        HandlebarsApplicationMixin: <T extends abstract new (...args: ConstructorParameters<typeof ApplicationV2Base>) => ApplicationV2Base>(
          Base: T
        ) => T;
        DialogV2: typeof DialogV2Base;
      };
    };
    utils: {
      randomID(length?: number): string;
      mergeObject<T extends object>(
        original: T,
        other: Partial<T>,
        options?: { insertKeys?: boolean; insertValues?: boolean; overwrite?: boolean; recursive?: boolean; inplace?: boolean; enforceTypes?: boolean }
      ): T;
      duplicate<T>(original: T): T;
      isEmpty(value: unknown): boolean;
      getProperty(object: object, key: string): unknown;
      setProperty(object: object, key: string, value: unknown): boolean;
    };
    data: {
      fields: {
        StringField: unknown;
        NumberField: unknown;
        BooleanField: unknown;
        ArrayField: unknown;
        ObjectField: unknown;
        SchemaField: unknown;
      };
    };
  };

  // ---------------------------------------------------------------------------
  // Base Foundry classes (simplified)
  // ---------------------------------------------------------------------------

  abstract class ApplicationV2Base {
    static readonly DEFAULT_OPTIONS: Record<string, unknown>;
    render(force?: boolean, options?: Record<string, unknown>): Promise<this>;
    close(options?: Record<string, unknown>): Promise<this>;
    get element(): HTMLElement;
    get title(): string;
  }

  abstract class DialogV2Base extends ApplicationV2Base {
    static confirm(options: { title: string; content: string; yes?: Record<string, unknown>; no?: Record<string, unknown> }): Promise<boolean>;
    static prompt(options: { title: string; content: string; ok?: Record<string, unknown> }): Promise<unknown>;
  }

  class ClientSettings {
    register(namespace: string, key: string, data: SettingConfig): void;
    get(namespace: string, key: string): unknown;
    set(namespace: string, key: string, value: unknown): Promise<unknown>;
    registerMenu(namespace: string, key: string, data: SettingMenuConfig): void;
  }

  interface SettingConfig {
    name: string;
    hint?: string;
    scope: "world" | "client";
    config?: boolean;
    type: typeof String | typeof Number | typeof Boolean | typeof Array | typeof Object;
    default?: unknown;
    onChange?: (value: unknown) => void;
    choices?: Record<string, string>;
  }

  interface SettingMenuConfig {
    name: string;
    label: string;
    hint?: string;
    icon?: string;
    type: typeof ApplicationV2Base;
    restricted?: boolean;
  }

  class CompendiumCollection {
    metadata: {
      id: string;
      name: string;
      label: string;
      type: "Item" | "Actor" | "JournalEntry";
      system: string;
    };
    get(id: string): unknown;
    getName(name: string): unknown;
    importDocument(document: Item | Actor | JournalEntry): Promise<unknown>;
    getDocuments(query?: Record<string, unknown>): Promise<unknown[]>;
    documentClass: typeof Item | typeof Actor | typeof JournalEntry;
    locked: boolean;
  }

  class Item {
    id: string;
    name: string;
    type: string;
    system: Record<string, unknown>;
    flags: Record<string, Record<string, unknown>>;
    static create(
      data: Record<string, unknown>,
      options?: Record<string, unknown>
    ): Promise<Item | undefined>;
    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<this>;
    toObject(): Record<string, unknown>;
  }

  class Actor {
    id: string;
    name: string;
    type: string;
    system: Record<string, unknown>;
    flags: Record<string, Record<string, unknown>>;
    static create(
      data: Record<string, unknown>,
      options?: Record<string, unknown>
    ): Promise<Actor | undefined>;
    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<this>;
    toObject(): Record<string, unknown>;
  }

  class JournalEntry {
    id: string;
    name: string;
    flags: Record<string, Record<string, unknown>>;
    static create(
      data: Record<string, unknown>,
      options?: Record<string, unknown>
    ): Promise<JournalEntry | undefined>;
    getFlag(scope: string, key: string): unknown;
    setFlag(scope: string, key: string, value: unknown): Promise<this>;
    toObject(): Record<string, unknown>;
  }

  class User {
    id: string;
    name: string;
    isGM: boolean;
    role: number;
  }

  class Users extends Map<string, User> {}

  class Localization {
    localize(key: string): string;
    format(key: string, data?: Record<string, unknown>): string;
  }

  class Collection<T> extends Map<string, T> {
    getName(name: string): T | undefined;
    find(fn: (entry: T) => boolean): T | undefined;
    filter(fn: (entry: T) => boolean): T[];
  }

  // Ensure TypeScript does not error on `export {}` in augmentation files.
}

export {};
