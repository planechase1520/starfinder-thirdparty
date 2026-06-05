/**
 * Mapping Rules — Milestone 4
 *
 * Defines the rule types used by the MappingEngine to transform a
 * ContentRecord's rawContent into Foundry system data.
 *
 * Rule types:
 *   exact      — Direct key-to-path copy with optional type coercion.
 *   alias      — Try multiple source keys; use the first non-null hit.
 *   transform  — Apply a named transformation function to the source value.
 *   computed   — Derive the target value from a JavaScript expression string.
 *   default    — Write a static default value when all other rules fail.
 *   nested     — Apply a sub-rule set to produce an object value.
 *
 * Rules are evaluated in order. The first rule that produces a non-null
 * value wins. If no rule produces a value, the field is left absent.
 */

// ── Rule kinds ────────────────────────────────────────────────────────────────

export type RuleKind = "exact" | "alias" | "transform" | "computed" | "default" | "nested";

/** Type coercions applied when reading from rawContent. */
export type CoercionType = "string" | "number" | "boolean" | "array" | "none";

// ── Base rule ─────────────────────────────────────────────────────────────────

interface BaseRule {
  kind: RuleKind;
  /** Dot-path in the target Foundry `system` object. */
  targetPath: string;
  /** Optional note shown in schema manager and mapping reports. */
  description?: string;
}

// ── Concrete rule types ───────────────────────────────────────────────────────

/** Copies rawContent[sourceKey] → targetPath with optional coercion. */
export interface ExactRule extends BaseRule {
  kind: "exact";
  sourceKey: string;
  coerce?: CoercionType;
  defaultValue?: unknown;
}

/** Tries multiple source keys in order; uses first non-null. */
export interface AliasRule extends BaseRule {
  kind: "alias";
  sourceKeys: string[];
  coerce?: CoercionType;
  defaultValue?: unknown;
}

/** Applies a registered named transform to the source value. */
export interface TransformRule extends BaseRule {
  kind: "transform";
  sourceKey: string;
  transformName: string;
  coerce?: CoercionType;
  defaultValue?: unknown;
}

/** Evaluated as: `(rawContent) => expression` — for computed fields. */
export interface ComputedRule extends BaseRule {
  kind: "computed";
  expression: string;
}

/** Writes a static value unconditionally. */
export interface DefaultRule extends BaseRule {
  kind: "default";
  value: unknown;
}

/** Applies a sub-rule set to produce a nested object. */
export interface NestedRule extends BaseRule {
  kind: "nested";
  rules: MappingRule[];
}

export type MappingRule = ExactRule | AliasRule | TransformRule | ComputedRule | DefaultRule | NestedRule;

// ── Transform registry ────────────────────────────────────────────────────────

type TransformFn = (value: unknown, rawContent: Record<string, unknown>) => unknown;

/** Registry of named transform functions available to TransformRule. */
export class TransformRegistry {
  private static readonly fns = new Map<string, TransformFn>();

  static register(name: string, fn: TransformFn): void {
    this.fns.set(name, fn);
  }

  static get(name: string): TransformFn | undefined {
    return this.fns.get(name);
  }

  static getRegisteredNames(): string[] {
    return [...this.fns.keys()];
  }
}

// ── Built-in transforms ───────────────────────────────────────────────────────

TransformRegistry.register("parseBulk", (value) => {
  const s = String(value ?? "").toLowerCase();
  if (s === "l") return 0.1;
  if (s === "-" || s === "") return 0;
  return Number(s) || 1;
});

TransformRegistry.register("parseCR", (value) => {
  const s = String(value ?? "1");
  if (s.includes("/")) {
    const [n, d] = s.split("/").map(Number);
    return n / d;
  }
  return Number(s) || 1;
});

TransformRegistry.register("parseMaxDex", (value) => {
  const s = String(value ?? "").trim();
  if (!s || s === "-" || s === "—") return 99;
  return Number(s) || 5;
});

TransformRegistry.register("parseAbility", (value) => {
  const map: Record<string, string> = {
    strength: "str",   str: "str",
    dexterity: "dex",  dex: "dex",
    constitution: "con", con: "con",
    intelligence: "int", int: "int",
    wisdom: "wis",     wis: "wis",
    charisma: "cha",   cha: "cha",
  };
  return map[String(value ?? "").toLowerCase()] ?? "str";
});

TransformRegistry.register("parseList", (value) => {
  if (Array.isArray(value)) return (value as unknown[]).map(String);
  if (!value) return [];
  return String(value).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
});

TransformRegistry.register("parseSize", (value) => {
  const lower = String(value ?? "").toLowerCase();
  if (lower.includes("fine"))      return "fine";
  if (lower.includes("dim"))       return "diminutive";
  if (lower.includes("tiny"))      return "tiny";
  if (lower.includes("small"))     return "small";
  if (lower.includes("large"))     return "large";
  if (lower.includes("huge"))      return "huge";
  if (lower.includes("garg"))      return "gargantuan";
  if (lower.includes("col"))       return "colossal";
  return "medium";
});

TransformRegistry.register("parseAlignment", (value) => {
  const map: Record<string, string> = {
    "lawful good": "lg", lg: "lg",
    "neutral good": "ng", ng: "ng",
    "chaotic good": "cg", cg: "cg",
    "lawful neutral": "ln", ln: "ln",
    neutral: "n", n: "n", true: "n",
    "chaotic neutral": "cn", cn: "cn",
    "lawful evil": "le", le: "le",
    "neutral evil": "ne", ne: "ne",
    "chaotic evil": "ce", ce: "ce",
  };
  return map[String(value ?? "").toLowerCase()] ?? "n";
});

// ── Coercion helper ───────────────────────────────────────────────────────────

export function coerceValue(value: unknown, coerce?: CoercionType): unknown {
  if (value === null || value === undefined) return undefined;
  switch (coerce) {
    case "string":  return String(value);
    case "number":  {
      const n = Number(value);
      return isNaN(n) ? 0 : n;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      const s = String(value).toLowerCase();
      return s === "true" || s === "yes" || s === "1";
    }
    case "array": {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        return value.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      }
      return [value];
    }
    default: return value;
  }
}
