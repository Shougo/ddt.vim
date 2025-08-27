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
              const cwd = await fn.gettabvar(
                args.denops,
                tabNr,
                "ddt_ui_last_directory",
                "",
              ) as string;
              return {
                word: cwd.length === 0
                  ? `[no ddt] ${await fn.getcwd(args.denops, 0, tabNr)}`
                  : cwd,
                action: {
                  cwd,
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
