import { assertEquals } from "@std/assert/equals";
import {
  defaultDdtOptions,
  foldMerge,
  mergeDdtOptions,
} from "../context.ts";
import type { DdtOptions } from "../types.ts";

Deno.test("defaultDdtOptions: returns expected default values", () => {
  const opts = defaultDdtOptions();
  assertEquals(opts.debug, false);
  assertEquals(opts.name, "default");
  assertEquals(opts.nvimServer, "");
  assertEquals(opts.ui, "");
  assertEquals(opts.uiOptions, {});
  assertEquals(opts.uiParams, {});
});

Deno.test("mergeDdtOptions: partial overwrite preserves unset keys", () => {
  const base = defaultDdtOptions();
  const patch: Partial<DdtOptions> = { name: "myterm", ui: "terminal" };
  const merged = mergeDdtOptions(base, patch);

  assertEquals(merged.name, "myterm");
  assertEquals(merged.ui, "terminal");
  assertEquals(merged.debug, false);
  assertEquals(merged.nvimServer, "");
});

Deno.test("mergeDdtOptions: uiOptions are deep-merged per UI name", () => {
  const base = defaultDdtOptions();
  base.uiOptions = { terminal: { actions: { quit: "close" } } };

  const patch: Partial<DdtOptions> = {
    uiOptions: { terminal: { actions: { open: "open" } }, shell: {} },
  };
  const merged = mergeDdtOptions(base, patch);

  // "terminal" entries are merged (patch overwrites)
  assertEquals(merged.uiOptions["terminal"].actions, { open: "open" });
  // "shell" is added from patch
  assertEquals(merged.uiOptions["shell"], {});
});

Deno.test("mergeDdtOptions: uiParams are deep-merged per UI name", () => {
  const base = defaultDdtOptions();
  base.uiParams = { terminal: { width: 80 } };

  const patch: Partial<DdtOptions> = {
    uiParams: { terminal: { height: 24 } },
  };
  const merged = mergeDdtOptions(base, patch);

  // both "terminal" entries are merged: base keys preserved, patch keys added
  assertEquals(merged.uiParams["terminal"], { width: 80, height: 24 });
});

Deno.test("mergeDdtOptions: empty patch returns equivalent to base", () => {
  const base = defaultDdtOptions();
  base.name = "custom";
  base.ui = "shell";

  const merged = mergeDdtOptions(base, {});
  assertEquals(merged.name, "custom");
  assertEquals(merged.ui, "shell");
  assertEquals(merged.debug, false);
});

Deno.test("foldMerge: identity with single default", () => {
  const result = foldMerge(mergeDdtOptions, defaultDdtOptions, []);
  assertEquals(result, defaultDdtOptions());
});

Deno.test("foldMerge: later partials override earlier ones", () => {
  const a: Partial<DdtOptions> = { name: "first", debug: true };
  const b: Partial<DdtOptions> = { name: "second" };
  const result = foldMerge(mergeDdtOptions, defaultDdtOptions, [a, b]);

  assertEquals(result.name, "second");
  assertEquals(result.debug, true);
});

Deno.test("foldMerge: null/undefined partials are treated as empty", () => {
  const a: Partial<DdtOptions> = { name: "test" };
  const result = foldMerge(mergeDdtOptions, defaultDdtOptions, [
    null,
    a,
    undefined,
  ]);
  assertEquals(result.name, "test");
  assertEquals(result.debug, false);
});
