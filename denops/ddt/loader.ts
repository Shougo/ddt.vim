import type { BaseParams, DdtExtType } from "./types.ts";
import type { BaseUi } from "./base/ui.ts";
import type { Denops } from "@denops/std";
import { importPlugin, isDenoCacheIssueError } from "./utils.ts";

import * as fn from "@denops/std/function";
import * as op from "@denops/std/option";

import { basename } from "@std/path/basename";
import { dirname } from "@std/path/dirname";
import { join } from "@std/path/join";
import { parse } from "@std/path/parse";
import { Lock } from "@core/asyncutil/lock";

type Ext = {
  ui: Record<string, BaseUi<BaseParams>>;
};

const PLUGIN_PREFIX = "@ddt";

// Pattern for directories where auto-loadable extensions are placed by type
const TYPE_DIR_PATTERN = `denops/${PLUGIN_PREFIX}-*s`;

// Structured extension module entry point file.
const EXT_ENTRY_POINT_FILE = "main.ts";

export class Loader {
  #exts: Ext = {
    ui: {},
  };
  #checkPaths: Record<string, boolean> = {};
  #registerLock = new Lock(0);
  #cachedPaths = new Map<string, string>();
  #prevRuntimepath = "";

  async autoload(
    denops: Denops,
    type: DdtExtType,
    name: string,
  ): Promise<boolean> {
    const runtimepath = await op.runtimepath.getGlobal(denops);
    if (runtimepath !== this.#prevRuntimepath) {
      const cachedPaths = await createPathCache(denops, runtimepath);

      // NOTE: glob may be invalid.
      if (cachedPaths.size > 0) {
        this.#cachedPaths = cachedPaths;
        this.#prevRuntimepath = runtimepath;
      }
    }

    const key = `${PLUGIN_PREFIX}-${type}s/${name}`;
    const path = this.#cachedPaths.get(key);

    if (!path) {
      return this.#prevRuntimepath === "";
    }

    await this.registerPath(type, path);
    return true;
  }

  async registerPath(type: DdtExtType, path: string): Promise<void> {
    // Fast-path: skip I/O if already registered.
    if (path in this.#checkPaths) {
      return;
    }

    const name = parse(path).name;

    // Perform I/O outside the lock so concurrent calls run in parallel.
    // NOTE: We intentionally use Deno.stat instead of safeStat here. We expect
    // errors to be thrown when paths don't exist or are inaccessible.
    // deno-lint-ignore no-explicit-any
    let importedMod: any;
    try {
      const fileInfo = await Deno.stat(path);
      const entryPoint = fileInfo.isDirectory
        ? join(path, EXT_ENTRY_POINT_FILE)
        : path;
      importedMod = await importPlugin(entryPoint);
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

    // Update shared state under lock; re-check to avoid duplicate registration
    // by concurrent calls that passed the fast-path check simultaneously.
    await this.#registerLock.lock(() => {
      if (path in this.#checkPaths) {
        return;
      }

      const typeExt = this.#exts[type];
      switch (type) {
        case "ui": {
          const ext = new importedMod.Ui();
          ext.name = name;
          ext.path = path;
          typeExt[name] = ext;
          break;
        }
      }

      this.#checkPaths[path] = true;
    });
  }

  async registerPaths(type: DdtExtType, paths: string[]): Promise<void> {
    const results = await Promise.allSettled(
      paths.map((path) => this.registerPath(type, path)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(
          `registerPaths: failed to register a path: ${result.reason}`,
        );
      }
    }
  }

  registerExtension(type: "ui", name: string, ext: BaseUi<BaseParams>): void;
  registerExtension(
    type: DdtExtType,
    name: string,
    ext: BaseUi<BaseParams>,
  ) {
    ext.name = name;
    this.#exts[type][name] = ext;
  }

  async getUi(
    denops: Denops,
    name: string,
  ): Promise<BaseUi<BaseParams> | null> {
    if (!this.#exts.ui[name]) {
      await this.autoload(denops, "ui", name);
    }

    return this.#exts.ui[name];
  }
}

async function createPathCache(
  denops: Denops,
  runtimepath: string,
): Promise<Map<string, string>> {
  const extFileGlob = await globpath(
    denops,
    runtimepath,
    `${TYPE_DIR_PATTERN}/*.ts`,
  );
  const extDirEntryPointGlob = await globpath(
    denops,
    runtimepath,
    `${TYPE_DIR_PATTERN}/*/${EXT_ENTRY_POINT_FILE}`,
  );

  // Create key paths for both single-file and directory entry points.
  // Prioritize the first occurrence key in keyPaths.
  const keyPaths: Readonly<[key: string, path: string]>[] = [
    //   1. `{name}.ts`
    ...extFileGlob.map((extFile) => {
      const { name, dir: typeDir } = parse(extFile);
      const typeDirName = basename(typeDir);
      const key = `${typeDirName}/${name}`;
      return [key, extFile] as const;
    }),
    //   2. `{name}/main.ts`
    ...extDirEntryPointGlob.map((entryPoint) => {
      const extDir = dirname(entryPoint);
      const { base: name, dir: typeDir } = parse(extDir);
      const typeDirName = basename(typeDir);
      const key = `${typeDirName}/${name}`;
      return [key, extDir] as const;
    }),
  ];

  // Remove duplicate keys.
  // Note that `Map` prioritizes the later value, so need to reversed.
  const cache = new Map(keyPaths.toReversed());

  return cache;
}

function globpath(
  denops: Denops,
  path: string,
  pattern: string,
): Promise<string[]> {
  return fn.globpath(denops, path, pattern, 1, 1) as unknown as Promise<
    string[]
  >;
}
