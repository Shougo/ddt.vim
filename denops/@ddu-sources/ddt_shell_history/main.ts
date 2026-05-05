import {
  ActionFlags,
  type Actions,
  type DduItem,
  type Item,
} from "@shougo/ddu-vim/types";
import { BaseSource } from "@shougo/ddu-vim/source";

import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";

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
        const histories: string[] = [];
        for (const path of args.sourceParams.paths) {
          const expandedPath = await fn.expand(args.denops, path) as string;
          const entries = await getHistory(
            expandedPath,
            args.sourceParams.limit,
          );
          entries.reverse();
          histories.push(...entries);
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

export async function getHistory(
  path: string,
  limit: number,
): Promise<string[]> {
  const seen = new Set<string>();
  const commands: string[] = [];
  let partial = "";
  const buf = new Uint8Array(32 * 1024);
  const decoder = new TextDecoder();

  let file: Deno.FsFile | undefined;
  try {
    file = await Deno.open(path, { read: true });
    // Stream the file in chunks to avoid loading it entirely into memory.
    let bytesRead: number | null;
    while ((bytesRead = await file.read(buf)) !== null) {
      const chunk = decoder.decode(buf.subarray(0, bytesRead), {
        stream: true,
      });
      const text = partial + chunk;
      const lines = text.split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) {
        // Get zsh command lines
        const match = line.match(/^: \d+:\d+;(.*)/);
        const cmd = match ? match[1] : line;
        if (cmd !== "" && !seen.has(cmd)) {
          seen.add(cmd);
          commands.push(cmd);
        }
      }
    }
    // Handle any remaining partial line at end of file.
    if (partial !== "") {
      const match = partial.match(/^: \d+:\d+;(.*)/);
      const cmd = match ? match[1] : partial;
      if (cmd !== "" && !seen.has(cmd)) {
        seen.add(cmd);
        commands.push(cmd);
      }
    }
  } catch (_: unknown) {
    // Ignore open/read errors (e.g. file not found, permission denied).
  } finally {
    file?.close();
  }

  return commands.slice(-limit);
}
