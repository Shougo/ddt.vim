import type {
  BaseParams,
  Context,
  ContextBuilder,
  DdtOptions,
  UiOptions,
  UserOptions,
} from "./types.ts";
import { printError } from "./utils.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

// where
// T: Object
// partialMerge: PartialMerge
// partialMerge(partialMerge(a, b), c) === partialMerge(a, partialMerge(b, c))
type PartialMerge<T> = (a: Partial<T>, b: Partial<T>) => Partial<T>;
type Merge<T> = (a: T, b: Partial<T>) => T;
type Default<T> = () => T;

function partialOverwrite<T>(a: Partial<T>, b: Partial<T>): Partial<T> {
  return { ...a, ...b };
}

function overwrite<T>(a: T, b: Partial<T>): T {
  return { ...a, ...b };
}

export const mergeUiOptions: Merge<UiOptions> = overwrite;

export const mergeUiParams: Merge<BaseParams> = overwrite;

export function foldMerge<T>(
  merge: Merge<T>,
  def: Default<T>,
  partials: (null | undefined | Partial<T>)[],
): T {
  return partials.map((x) => x || {}).reduce(merge, def());
}

export function defaultContext(): Context {
  return {};
}

export function defaultDdtOptions(): DdtOptions {
  return {
    name: "",
    nvimServer: "",
    ui: "",
    uiOptions: {},
    uiParams: {},
  };
}

export function defaultDummy(): Record<string, unknown> {
  return {};
}

function migrateEachKeys<T>(
  merge: PartialMerge<T>,
  a: null | undefined | Record<string, Partial<T>>,
  b: null | undefined | Record<string, Partial<T>>,
): null | Record<string, Partial<T>> {
  if (!a && !b) return null;
  const ret: Record<string, Partial<T>> = {};
  if (a) {
    for (const key in a) {
      ret[key] = a[key];
    }
  }
  if (b) {
    for (const key in b) {
      if (key in ret) {
        ret[key] = merge(ret[key], b[key]);
      } else {
        ret[key] = b[key];
      }
    }
  }
  return ret;
}

export function mergeDdtOptions(
  a: DdtOptions,
  b: Partial<DdtOptions>,
): DdtOptions {
  const overwritten: DdtOptions = overwrite(a, b);
  const partialMergeUiOptions = partialOverwrite;
  const partialMergeUiParams = partialOverwrite;

  return Object.assign(overwritten, {
    uiOptions: migrateEachKeys(
      partialMergeUiOptions,
      a.uiOptions,
      b.uiOptions,
    ) || {},
    uiParams: migrateEachKeys(
      partialMergeUiParams,
      a.uiParams,
      b.uiParams,
    ) || {},
  });
}

function patchDdtOptions(
  a: Partial<DdtOptions>,
  b: Partial<DdtOptions>,
): Partial<DdtOptions> {
  const overwritten: Partial<DdtOptions> = { ...a, ...b };

  const uo = migrateEachKeys(
    partialOverwrite,
    a.uiOptions,
    b.uiOptions,
  );
  if (uo) overwritten.uiOptions = uo;

  const up = migrateEachKeys(partialOverwrite, a.uiParams, b.uiParams);
  if (up) overwritten.uiParams = up;

  return overwritten;
}

// Customization by end users
class Custom {
  global: Partial<DdtOptions> = {};
  local: Record<string, Partial<DdtOptions>> = {};

  get(userOptions: UserOptions): DdtOptions {
    const options = foldMerge(mergeDdtOptions, defaultDdtOptions, [
      this.global,
      userOptions,
    ]);
    const name = options.name;
    const local = this.local[name] || {};
    return foldMerge(mergeDdtOptions, defaultDdtOptions, [
      this.global,
      local,
      userOptions,
    ]);
  }

  setGlobal(options: Partial<DdtOptions>): Custom {
    this.global = options;
    return this;
  }
  setLocal(name: string, options: Partial<DdtOptions>): Custom {
    this.local[name] = options;
    return this;
  }
  patchGlobal(options: Partial<DdtOptions>): Custom {
    this.global = patchDdtOptions(this.global, options);
    return this;
  }
  patchLocal(name: string, options: Partial<DdtOptions>): Custom {
    this.local[name] = patchDdtOptions(
      this.local[name] || {},
      options,
    );
    return this;
  }
}

export class ContextBuilderImpl implements ContextBuilder {
  #custom: Custom = new Custom();

  async get(
    denops: Denops,
    options: UserOptions,
  ): Promise<[Context, DdtOptions]> {
    const userOptions = this.#custom.get(options);

    await this.validate(denops, "options", userOptions, defaultDdtOptions());

    return [
      {},
      userOptions,
    ];
  }

  async validate(
    denops: Denops,
    name: string,
    options: Record<string, unknown>,
    defaults: Record<string, unknown>,
  ) {
    for (const key in options) {
      if (!(key in defaults)) {
        await printError(denops, `Invalid ${name}: "${key}"`);
      }
    }
  }

  getGlobal(): Partial<DdtOptions> {
    return this.#custom.global;
  }
  getLocal(): Record<string, Partial<DdtOptions>> {
    return this.#custom.local;
  }

  setGlobal(options: Partial<DdtOptions>) {
    this.#custom.setGlobal(options);
  }
  setLocal(name: string, options: Partial<DdtOptions>) {
    this.#custom.setLocal(name, options);
  }

  patchGlobal(options: Partial<DdtOptions>) {
    this.#custom.patchGlobal(options);
  }
  patchLocal(name: string, options: Partial<DdtOptions>) {
    this.#custom.patchLocal(name, options);
  }
}
