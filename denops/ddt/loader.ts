import type { BaseParams, DdtExtType, UiName } from "./types.ts";
import type { BaseUi } from "./base/ui.ts";
import type { Denops } from "jsr:@denops/std@~7.2.0";
import { isDenoCacheIssueError } from "./utils.ts";

import * as fn from "jsr:@denops/std@~7.2.0/function";
import * as op from "jsr:@denops/std@~7.2.0/option";

import { basename } from "jsr:@std/path@~1.0.2/basename";
import { parse } from "jsr:@std/path@~1.0.2/parse";
import { toFileUrl } from "jsr:@std/path@~1.0.2/to-file-url";
import { Lock } from "jsr:@core/asyncutil@~1.2.0/lock";

type Mod = {
  // deno-lint-ignore no-explicit-any
  mod: any;
  path: string;
};

export class Loader {
  #extensions: Record<string, Extension> = {};
  #mods: Record<DdtExtType, Record<string, Mod>> = {
    ui: {},
  };
  #checkPaths: Record<string, boolean> = {};
  #registerLock = new Lock(0);
  #cachedPaths: Record<string, string> = {};
  #prevRuntimepath = "";

  async autoload(
    denops: Denops,
    type: DdtExtType,
    name: string,
  ): Promise<boolean> {
    const runtimepath = await op.runtimepath.getGlobal(denops);
    if (runtimepath !== this.#prevRuntimepath) {
      const cached = await globpath(
        denops,
        "denops/@ddt-*s",
      );
      // NOTE: glob may be invalid.
      if (Object.keys(cached).length > 0) {
        this.#cachedPaths = cached;
      }
      this.#prevRuntimepath = runtimepath;
    }

    const key = `@ddt-${type}s/${name}`;

    if (!this.#cachedPaths[key]) {
      return this.#prevRuntimepath === "";
    }

    await this.registerPath(type, this.#cachedPaths[key]);

    // NOTE: this.#prevRuntimepath may be true if initialized.
    // NOTE: If not found, it returns false, .
    return this.#prevRuntimepath === "" || this.#cachedPaths[key] !== undefined;
  }

  async registerPath(type: DdtExtType, path: string) {
    await this.#registerLock.lock(async () => {
      try {
        await this.#register(type, path);
      } catch (e) {
        if (isDenoCacheIssueError(e)) {
          console.warn("*".repeat(80));
          console.warn(`Deno module cache issue is detected.`);
          console.warn(
            `Execute '!deno cache --reload "${path}"' and restart Vim/Neovim.`,
          );
          console.warn("*".repeat(80));
        }

        console.error(`Failed to load file '${path}': ${e}`);
        throw e;
      }
    });
  }

  getUi(index: string, name: string): BaseUi<BaseParams> | null {
    const mod = this.#mods.ui[name];
    if (!mod) {
      return null;
    }

    return this.#getExtension(index).getUi(mod, name);
  }

  #getExtension(index: string): Extension {
    if (!this.#extensions[index]) {
      this.#extensions[index] = new Extension();
    }

    return this.#extensions[index];
  }

  async #register(type: DdtExtType, path: string) {
    if (path in this.#checkPaths) {
      return;
    }

    const typeMods = this.#mods[type];

    const name = parse(path).name;

    const mod: Mod = {
      mod: await import(toFileUrl(path).href),
      path,
    };

    typeMods[name] = mod;

    this.#checkPaths[path] = true;
  }
}

class Extension {
  #uis: Record<UiName, BaseUi<BaseParams>> = {};

  getUi(mod: Mod, name: string): BaseUi<BaseParams> {
    if (!this.#uis[name]) {
      const obj = new mod.mod.Ui();
      obj.name = name;
      obj.path = mod.path;
      this.#uis[obj.name] = obj;
    }
    return this.#uis[name];
  }
}

async function globpath(
  denops: Denops,
  search: string,
): Promise<Record<string, string>> {
  const runtimepath = await op.runtimepath.getGlobal(denops);

  const paths: Record<string, string> = {};
  const glob = await fn.globpath(
    denops,
    runtimepath,
    search + "/*.ts",
    1,
    1,
  );

  for (const path of glob) {
    // Skip already added name.
    const parsed = parse(path);
    const key = `${basename(parsed.dir)}/${parsed.name}`;
    if (key in paths) {
      continue;
    }

    paths[key] = path;
  }

  return paths;
}