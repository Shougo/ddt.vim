import type { BaseParams, Context, DdtOptions, UserOptions } from "./types.ts";
import type { Loader } from "./loader.ts";
import {
  defaultContext,
  defaultDdtOptions,
  foldMerge,
  mergeDdtOptions,
} from "./context.ts";
import { getUi, uiAction } from "./ext.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";
import * as fn from "jsr:@denops/std@~7.4.0/function";

export class Ddt {
  #loader: Loader;
  #context: Context = defaultContext();
  #options: DdtOptions = defaultDdtOptions();

  constructor(loader: Loader) {
    this.#loader = loader;
  }

  async start(
    denops: Denops,
    context: Context,
    options: DdtOptions,
    userOptions: UserOptions,
  ): Promise<void> {
    this.#context = context;
    this.#options = options;

    this.updateOptions(userOptions);

    const [ui, uiOptions, uiParams] = await getUi(
      denops,
      this.#loader,
      this.#options,
    );
    if (!ui) {
      return;
    }

    await ui.redraw({
      denops,
      context: this.#context,
      options: this.#options,
      uiOptions,
      uiParams,
    });

    // Redraw is needed.
    await denops.cmd("redraw");
  }

  async uiAction(
    denops: Denops,
    actionName: string,
    actionParams: BaseParams,
  ): Promise<void> {
    if (await fn.getcmdwintype(denops) !== "") {
      // Skip when Command line window
      return;
    }

    const [ui, _uiOptions, _uiParams, _ret] = await uiAction(
      denops,
      this.#loader,
      this.#context,
      this.#options,
      actionName,
      actionParams,
    );
    if (!ui) {
      return;
    }

    // Redraw is needed.
    await denops.cmd("redraw");
  }

  async getInput(
    denops: Denops,
  ): Promise<string> {
    const [ui, uiOptions, uiParams] = await getUi(
      denops,
      this.#loader,
      this.#options,
    );
    if (!ui) {
      return "";
    }

    return await ui.getInput({
      denops,
      context: this.#context,
      options: this.#options,
      uiOptions,
      uiParams,
    });
  }

  updateOptions(userOptions: UserOptions) {
    this.#options = foldMerge(mergeDdtOptions, defaultDdtOptions, [
      this.#options,
      userOptions,
    ]);
  }

  getOptions(): DdtOptions {
    return this.#options;
  }
}
