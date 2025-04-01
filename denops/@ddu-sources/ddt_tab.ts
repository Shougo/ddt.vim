import type { Item } from "jsr:@shougo/ddu-vim@~10.3.0/types";
import { BaseSource } from "jsr:@shougo/ddu-vim@~10.3.0/source";
import type { ActionData } from "../@ddu-kinds/ddt_tab.ts";

import type { Denops } from "jsr:@denops/core@~7.0.0";
import * as fn from "jsr:@denops/std@~7.5.0/function";

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
