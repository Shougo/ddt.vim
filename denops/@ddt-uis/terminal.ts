import { BaseParams, DdtOptions, UiOptions } from "../ddt/types.ts";
import { BaseUi, UiActions } from "../ddt/base/ui.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";
import * as fn from "jsr:@denops/std@~7.4.0/function";
import * as vars from "jsr:@denops/std@~7.4.0/variable";
import { batch } from "jsr:@denops/std@~7.4.0/batch";

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
    console.log(args);

    if (await fn.bufexists(args.denops, this.#bufNr)) {
      await this.#switchBuffer();
    } else {
      await this.#newBuffer(args.denops, args.options, args.uiParams);
    }
  }

  override actions: UiActions<Params> = {
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
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
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
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
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
      callback: async (_args: {
        denops: Denops;
        options: DdtOptions;
        actionParams: BaseParams;
      }) => {
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

  async #switchBuffer() {
  }

  async #newBuffer(denops: Denops, options: DdtOptions, params: Params) {
    const cwd = params.cwd === "" ? await fn.getcwd(denops) : params.cwd;
    if (!await fn.isdirectory(denops, cwd)) {
      // TODO: Create the directory.
    }

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
        await this.#stopInsert(denops);
      }
    } else {
      // In Vim8, must be insert mode to redraw
      await denops.cmd("startinsert");
    }

    await this.#initOptions(denops, options);
  }

  async #stopInsert(denops: Denops) {
    if (denops.meta.host === "nvim") {
      await denops.cmd("stopinsert");
    } else {
      await denops.cmd("sleep 50m");
      await fn.feedkeys(denops, "\\<C-\\>\\<C-n>", "n");
    }
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

      // set filetype twice to load after/ftplugin in Vim8
      await fn.setbufvar(denops, this.#bufNr, "&filetype", "ddt-terminal");
      await fn.setbufvar(denops, this.#bufNr, "&filetype", "ddt-terminal");
    });
  }
}
