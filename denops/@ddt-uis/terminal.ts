import { BaseParams, BaseUi, DdtOptions, UiActions } from "../ddt/base/ui.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

export type Params = Record<string, never>;

export class Ui extends BaseUi<Params> {
  override redraw(args: {
    denops: Denops;
  }): void | Promise<void> {
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
    return {};
  }
}
