import { BaseParams, DdtOptions, UiOptions } from "../ddt/types.ts";
import { BaseUi, UiActions } from "../ddt/base/ui.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";
import * as fn from "jsr:@denops/std@~7.4.0/function";
import * as vars from "jsr:@denops/std@~7.4.0/variable";
import { batch } from "jsr:@denops/std@~7.4.0/batch";
import {
  type RawString,
  rawString,
  useEval,
} from "jsr:@denops/std@~7.4.0/eval";

export type Params = {
  autoCd: boolean;
  command: string[];
  cwd: string;
  edit: boolean;
  editFiletype: string;
  editWinHeight: number;
  externalHistoryPath: string;
  extraTermOptions: Record<string, unknown>;
  floatingBorder: string;
  internalHistoryPath: string;
  nvimServer: string;
  promptPattern: string;
  shellHistoryMax: number;
  split: string;
  startInsert: boolean;
  toggle: boolean;
  winCol: number;
  winHeight: number;
  winRow: number;
  winWidth: number;
};

type CdParams = {
  directory: string;
};

export class Ui extends BaseUi<Params> {
  #bufNr = -1;
  #jobid = -1;
  #pid = -1;

  override async redraw(args: {
    denops: Denops;
    options: DdtOptions;
    uiOptions: UiOptions;
    uiParams: Params;
  }): Promise<void> {
    if (await fn.bufexists(args.denops, this.#bufNr)) {
      await this.#switchBuffer(args.denops);
    } else {
      await this.#newBuffer(args.denops, args.options, args.uiParams);
    }
  }

  override actions: UiActions<Params> = {
    cd: {
      description: "Change current directory",
      callback: async (args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
        if (await fn.bufnr(args.denops, "%") != this.#bufNr) {
          return;
        }

        const params = args.actionParams as CdParams;

        const stat = await safeStat(params.directory);
        if (!stat || !stat.isDirectory) {
          return;
        }

        const quote = await fn.has(args.denops, "win32") ? '"' : "'";
        const cleanup = await fn.has(args.denops, "win32")
          ? ""
          : rawString`\<C-u>`;
        await jobSendString(
          args.denops,
          this.#bufNr,
          this.#jobid,
          rawString`${cleanup}cd ${quote}${params.directory}${quote}\<CR>`,
        );

        await termRedraw(args.denops, this.#bufNr);
      },
    },
    executeLine: {
      description: "Execute the command line",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
    edit: {
      description: "Open the edit buffer",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
    nextPrompt: {
      description: "Move to next prompt from cursor",
      callback: async (args: {
        denops: Denops;
        options: DdtOptions;
        uiParams: Params;
        actionParams: BaseParams;
      }) => {
        if (
          args.uiParams.promptPattern === "" ||
          await fn.bufnr(args.denops, "%") != this.#bufNr
        ) {
          return;
        }

        await searchPrompt(
          args.denops,
          args.uiParams.promptPattern,
          "Wn",
        );
      },
    },
    pastePrompt: {
      description: "Paste the history to the command line",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
    previousPrompt: {
      description: "Move to previous prompt from cursor",
      callback: async (args: {
        denops: Denops;
        options: DdtOptions;
        uiParams: Params;
        actionParams: BaseParams;
      }) => {
        if (
          args.uiParams.promptPattern === "" ||
          await fn.bufnr(args.denops, "%") != this.#bufNr
        ) {
          return;
        }

        await searchPrompt(
          args.denops,
          args.uiParams.promptPattern,
          "bWn",
        );
      },
    },
    quit: {
      description: "Quit the window",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
    startAppend: {
      description: "Start insert mode and move the cursor to the next column",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
    startAppendLast: {
      description: "Start insert mode and move the cursor to the last column",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
    startInsert: {
      description: "Start insert mode",
      callback: async (args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
        await args.denops.cmd("startinsert");
      },
    },
    startInsertFirst: {
      description: "Start insert mode and move the cursor to the first column",
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
      },
    },
  };

  override params(): Params {
    return {
      autoCd: true,
      command: [],
      cwd: "",
      edit: false,
      editFiletype: "",
      editWinHeight: 1,
      externalHistoryPath: "",
      extraTermOptions: {},
      floatingBorder: "",
      internalHistoryPath: "",
      nvimServer: "",
      promptPattern: "",
      shellHistoryMax: 500,
      split: "",
      startInsert: false,
      toggle: false,
      winCol: 50,
      winHeight: 15,
      winRow: 20,
      winWidth: 80,
    };
  }

  async #switchBuffer(denops: Denops) {
    await denops.cmd(`buffer ${this.#bufNr}`);

    await vars.g.set(
      denops,
      "ddt_ui_terminal_winid",
      await fn.win_getid(denops),
    );
  }

  async #newBuffer(denops: Denops, options: DdtOptions, params: Params) {
    const cwd = params.cwd === "" ? await fn.getcwd(denops) : params.cwd;
    const stat = await safeStat(cwd);
    if (!stat || !stat.isDirectory) {
      // TODO: Create the directory.
      const result = await fn.confirm(
        denops,
        `${cwd} is not directory.  Create?`,
        "&Yes\n&No\n&Cancel",
      );
      if (result != 1) {
        return;
      }

      await fn.mkdir(denops, cwd, "p");
    }

    // Set $EDITOR
    await denops.call("ddt#ui#terminal#_set_editor", params.nvimServer);

    if (denops.meta.host === "nvim") {
      // NOTE: ":terminal" replaces current buffer
      await denops.cmd("enew");

      // NOTE: termopen() is deprecated.
      await denops.call("jobstart", params.command, {
        ...params.extraTermOptions,
        term: true,
      });

      this.#jobid = await vars.b.get(denops, "terminal_job_id");
      this.#pid = await vars.b.get(denops, "terminal_job_pid");
    } else {
      this.#pid = await denops.call("term_start", params.command, {
        ...params.extraTermOptions,
        curwin: true,
        term_kill: "kill",
      }) as number;
    }

    this.#bufNr = await fn.bufnr(denops, "%");

    if (denops.meta.host === "nvim") {
      if (params.startInsert) {
        await denops.cmd("startinsert");
      } else {
        await stopInsert(denops);
      }
    } else {
      // In Vim8, must be insert mode to redraw
      await denops.cmd("startinsert");
    }

    await this.#initOptions(denops, options);

    await vars.b.set(denops, "ddt_ui_name", options.name);
    await vars.t.set(denops, "ddt_ui_last_bufnr", this.#bufNr);

    await vars.t.set(denops, "ddt_ui_terminal_directory", cwd);
    await vars.g.set(
      denops,
      "ddt_ui_terminal_winid",
      await fn.win_getid(denops),
    );
  }

  async #winId(denops: Denops): Promise<number> {
    const winIds = await fn.win_findbuf(denops, this.#bufNr) as number[];
    return winIds.length > 0 ? winIds[0] : -1;
  }

  async #initOptions(denops: Denops, options: DdtOptions) {
    const winid = await this.#winId(denops);
    const existsSmoothScroll = await fn.exists(denops, "+smoothscroll");

    await batch(denops, async (denops: Denops) => {
      await fn.setbufvar(denops, this.#bufNr, "ddt_ui_name", options.name);

      // Set options
      await fn.setwinvar(denops, winid, "&list", 0);
      await fn.setwinvar(denops, winid, "&colorcolumn", "");
      await fn.setwinvar(denops, winid, "&foldcolumn", 0);
      await fn.setwinvar(denops, winid, "&foldenable", 0);
      await fn.setwinvar(denops, winid, "&number", 0);
      await fn.setwinvar(denops, winid, "&relativenumber", 0);
      await fn.setwinvar(denops, winid, "&spell", 0);
      await fn.setwinvar(denops, winid, "&wrap", 0);
      await fn.setwinvar(denops, winid, "&winfixbuf", true);

      // NOTE: If smoothscroll is set in neovim, freezed in terminal buffer.
      if (existsSmoothScroll) {
        await fn.setwinvar(denops, winid, "&smoothscroll", false);
      }

      await fn.setbufvar(denops, this.#bufNr, "&bufhidden", "hide");
      await fn.setbufvar(denops, this.#bufNr, "&swapfile", 0);
    });

    // NOTE: setfiletype must be the last
    await fn.setbufvar(denops, this.#bufNr, "&filetype", "ddt-terminal");
  }
}

async function stopInsert(denops: Denops) {
  await useEval(denops, async (denops: Denops) => {
    if (denops.meta.host === "nvim") {
      await denops.cmd("stopinsert");
    } else {
      await denops.cmd("sleep 50m");
      await fn.feedkeys(denops, rawString`\<C-\>\<C-n>`, "n");
    }
  });
}

async function searchPrompt(
  denops: Denops,
  promptPattern: string,
  flags: string,
) {
  const currentCol = await fn.col(denops, ".");
  await fn.cursor(denops, 0, 1);
  const pattern = `^\\%(${promptPattern}\\m\\).\\?`;
  const pos = await fn.searchpos(denops, pattern, flags) as number[];
  if (pos[0] != 0) {
    const col = await fn.matchend(
      denops,
      await fn.getline(denops, pos[0]),
      pattern,
    );
    await fn.cursor(
      denops,
      pos[0],
      col,
    );
  } else {
    await fn.cursor(denops, 0, currentCol);
  }
}

async function jobSendString(
  denops: Denops,
  bufNr: number,
  jobid: number,
  keys: RawString,
) {
  await useEval(denops, async (denops: Denops) => {
    if (denops.meta.host === "nvim") {
      await denops.call("chansend", jobid, keys);
    } else {
      await denops.call("term_sendkeys", bufNr, keys);
      await termRedraw(denops, bufNr);
      await denops.call("term_wait", bufNr);
    }
  });
}

async function termRedraw(
  denops: Denops,
  bufNr: number,
) {
  if (denops.meta.host === "nvim") {
    await denops.cmd("redraw");
    return;
  }

  // NOTE: In Vim8, auto redraw does not work!
  const ids = await fn.win_findbuf(denops, bufNr);
  if (ids.length === 0) {
    return;
  }

  const prevWinId = await fn.win_getid(denops);

  await fn.win_gotoid(denops, ids[0]);

  // Goto insert mode
  await denops.cmd("redraw");
  await denops.cmd("normal! A");

  // Go back to normal mode
  await stopInsert(denops);

  await fn.win_gotoid(denops, prevWinId);
}

const safeStat = async (path: string): Promise<Deno.FileInfo | null> => {
  // NOTE: Deno.stat() may be failed
  try {
    const stat = await Deno.lstat(path);
    if (stat.isSymlink) {
      try {
        const stat = await Deno.stat(path);
        stat.isSymlink = true;
        return stat;
      } catch (_: unknown) {
        // Ignore stat exception
      }
    }
    return stat;
  } catch (_: unknown) {
    // Ignore stat exception
  }
  return null;
};
