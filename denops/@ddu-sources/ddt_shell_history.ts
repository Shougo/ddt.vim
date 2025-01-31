import {
  ActionFlags,
  type Actions,
  type DduItem,
  type Item,
} from "jsr:@shougo/ddu-vim@~9.4.0/types";
import { BaseSource } from "jsr:@shougo/ddu-vim@~9.4.0/source";
import { safeStat } from "../ddt/utils.ts";

import type { Denops } from "jsr:@denops/core@~7.0.0";
import * as fn from "jsr:@denops/std@~7.4.0/function";

type Params = {
  limit: number;
  paths: string[];
};

type ActionData = {
  commandLine: string;
};

export class Source extends BaseSource<Params> {
  override gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        let histories: string[] = [];
        for (const path of args.sourceParams.paths) {
          const expandedPath = await fn.expand(args.denops, path) as string;
          histories = histories.concat(
            (await getHistory(expandedPath, args.sourceParams.limit)).reverse(),
          );
        }

        const items = histories.map((history) => {
          return {
            word: history,
            action: {
              commandLine: history,
            },
          };
        });

        controller.enqueue(items);

        controller.close();
      },
    });
  }

  override actions: Actions<Params> = {
    edit: async (args: {
      denops: Denops;
      items: DduItem[];
      sourceParams: Params;
    }) => {
      for (const item of args.items) {
        const action = item.action as ActionData;

        const commandLine = await args.denops.call(
          "input",
          "New Commandline: ",
          action.commandLine,
          "shellcmdline",
        ) as string;
        await args.denops.cmd("redraw");
        if (commandLine.length === 0) {
          continue;
        }

        await args.denops.call("ddt#ui#do_action", "send", {
          str: commandLine,
        });
      }

      return Promise.resolve(ActionFlags.None);
    },
    execute: async (args: {
      denops: Denops;
      items: DduItem[];
      sourceParams: Params;
    }) => {
      for (const item of args.items) {
        const action = item.action as ActionData;

        await args.denops.call("ddt#ui#do_action", "send", {
          str: action.commandLine,
        });
      }

      return Promise.resolve(ActionFlags.None);
    },
    insert: async (args: {
      denops: Denops;
      items: DduItem[];
      sourceParams: Params;
    }) => {
      for (const item of args.items) {
        const action = item.action as ActionData;

        await args.denops.call("ddt#ui#do_action", "insert", {
          str: action.commandLine,
        });
      }

      return Promise.resolve(ActionFlags.None);
    },
  };

  override params(): Params {
    return {
      limit: 500,
      paths: [],
    };
  }
}

async function getHistory(path: string, limit: number): Promise<string[]> {
  const stat = await safeStat(path);
  if (!stat) {
    return [];
  }

  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile(path);
  const lines = decoder.decode(data).split("\n");

  // Get zsh command lines
  const commands = lines.map((line) => {
    const match = line.match(/^: \d+:\d+;(.*)/);
    return match ? match[1] : line;
  }).filter((cmd) => cmd !== "");

  function uniq(arr: string[]): string[] {
    const seen = new Set<string>();
    return arr.filter((item) => {
      if (seen.has(item)) {
        return false;
      } else {
        seen.add(item);
        return true;
      }
    });
  }

  return uniq(commands).slice(-limit);
}
