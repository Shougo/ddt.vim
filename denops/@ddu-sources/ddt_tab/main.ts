import type { Item } from "@shougo/ddu-vim/types";
import { BaseSource } from "@shougo/ddu-vim/source";
import type { ActionData } from "../../@ddu-kinds/ddt_tab/main.ts";

import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";

type Params = Record<string, never>;

export class Source extends BaseSource<Params> {
  override kind = "ddt_tab";

  override gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const items = Promise.all(
          [...Array(await fn.tabpagenr(args.denops, "$"))].map(
            async (_, i) => {
              const tabNr = i + 1;
              const { cwd, exists } = await getTabCwd(args.denops, tabNr);
              const label = exists
                ? cwd
                : cwd.length === 0
                ? `[no ddt tab] tab ${tabNr}`
                : `[no ddt] ${cwd}`;
              return {
                word: label,
                action: {
                  cwd: cwd.length > 0 ? cwd : await fn.getcwd(args.denops),
                  tabNr: tabNr,
                },
              };
            },
          ),
        );

        controller.enqueue(
          await items,
        );

        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}

async function getTabCwd(
  denops: Denops,
  tabNr: number,
): Promise<{ cwd: string; exists: boolean }> {
  try {
    const cwd = await fn.gettabvar(
      denops,
      tabNr,
      "ddt_ui_last_directory",
      "",
    ) as string;

    if (cwd.length > 0) {
      return { cwd, exists: true };
    }
  } catch (_e: unknown) {
    // Fall through and use getcwd() as a fallback.
  }

  try {
    return { cwd: await fn.getcwd(denops, 0, tabNr), exists: false };
  } catch (_e: unknown) {
    return { cwd: "", exists: false };
  }
}
