import {
  ActionFlags,
  type Actions,
  type DduItem,
} from "jsr:@shougo/ddu-vim@~10.3.0/types";
import { BaseKind } from "jsr:@shougo/ddu-vim@~10.3.0/kind";
import { printError, safeStat } from "jsr:@shougo/ddu-vim@~10.3.0/utils";

import type { Denops } from "jsr:@denops/core@~7.0.0";
import * as fn from "jsr:@denops/std@~7.6.0/function";
import * as vars from "jsr:@denops/std@~7.6.0/variable";

export type ActionData = {
  cwd: string;
  tabNr: number;
};

type Params = Record<string, never>;

export class Kind extends BaseKind<Params> {
  override actions: Actions<Params> = {
    delete: {
      description: "Delete ddt tab.",
      callback: async (args: { denops: Denops; items: DduItem[] }) => {
        const currentTab = await fn.tabpagenr(args.denops);
        const tabNrs = args.items
          .map((item) => (item?.action as ActionData)?.tabNr)
          .filter((tabNr) => tabNr !== undefined && tabNr != currentTab);

        for (const tabNr of tabNrs.sort().reverse()) {
          await args.denops.cmd(`silent! tabclose ${tabNr}`);
        }

        return Promise.resolve(ActionFlags.Persist | ActionFlags.RefreshItems);
      },
    },
    edit: {
      description: "Change ddt tab directory.",
      callback: async (args: { denops: Denops; items: DduItem[] }) => {
        for (const item of args.items) {
          const action = item?.action as ActionData;
          const cwd = await fn.gettabvar(
            args.denops,
            action.tabNr,
            "ddt_ui_last_directory",
            await fn.getcwd(args.denops, 0, action.tabNr),
          ) as string;

          const newCwd = await fn.input(
            args.denops,
            "New ddt cwd: ",
            cwd,
            "dir",
          );
          await args.denops.cmd("redraw");
          if (newCwd.length === 0 || newCwd === cwd) {
            continue;
          }

          const stat = await safeStat(newCwd);

          if (stat?.isFile) {
            await printError(
              args.denops,
              `${newCwd} is not directory.`,
            );
            continue;
          }

          if (!stat) {
            const result = await fn.confirm(
              args.denops,
              `${newCwd} is not directory.  Create?`,
              "&Yes\n&No\n&Cancel",
            );
            if (result != 1) {
              continue;
            }

            await fn.mkdir(args.denops, newCwd, "p");
          }

          await args.denops.cmd(`tabnext ${action.tabNr}`);

          // Move to ddt buffer
          const bufNr = await vars.t.get(args.denops, "ddt_ui_last_bufnr", -1);
          if (bufNr > 0) {
            await args.denops.cmd(`buffer ${bufNr}`);
            await args.denops.call("ddt#ui#do_action", "cd", {
              directory: newCwd,
            });
          }

          await args.denops.cmd(`noautocmd tcd ${newCwd}`);
        }

        return Promise.resolve(ActionFlags.None);
      },
    },
    switch: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        const action = item?.action as ActionData;
        await args.denops.cmd(`tabnext ${action.tabNr}`);

        const bufNr = await vars.t.get(args.denops, "ddt_ui_last_bufnr", -1);
        if (bufNr > 0) {
          await vars.t.set(args.denops, "ddt_ui_last_bufnr", bufNr);

          await vars.g.set(
            args.denops,
            "ddt_ui_last_winid",
            await fn.win_getid(args.denops),
          );

          if (await fn.bufnr(args.denops, "%") === bufNr) {
            await args.denops.call("ddt#ui#do_action", "redraw");
          }
        }
      }

      return Promise.resolve(ActionFlags.None);
    },
    new: {
      description: "Create new ddt tab directory.",
      callback: async (args: { denops: Denops; items: DduItem[] }) => {
        for (const item of args.items) {
          const action = item?.action as ActionData;
          const cwd = action.cwd.length === 0
            ? await fn.getcwd(args.denops)
            : action.cwd;

          const newCwd = await fn.input(
            args.denops,
            "New cwd: ",
            cwd,
            "dir",
          );
          await args.denops.cmd("redraw");
          if (newCwd.length === 0) {
            continue;
          }

          // Note: Deno.stat() may be failed
          try {
            const fileInfo = await Deno.stat(newCwd);

            if (fileInfo.isFile) {
              await printError(
                args.denops,
                `${newCwd} is not directory.`,
              );
              continue;
            }
          } catch (_e: unknown) {
            const result = await fn.confirm(
              args.denops,
              `${newCwd} is not directory.  Create?`,
              "&Yes\n&No\n&Cancel",
            );
            if (result != 1) {
              continue;
            }

            await fn.mkdir(args.denops, newCwd, "p");
          }

          await args.denops.cmd(
            `tabnext ${action.tabNr} | tabnew | tcd ${newCwd}`,
          );
        }

        return Promise.resolve(ActionFlags.None);
      },
    },
  };

  override params(): Params {
    return {};
  }
}
