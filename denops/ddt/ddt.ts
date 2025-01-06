import type { Context, DdtOptions, UserOptions } from "./types.ts";
import type { Loader } from "./loader.ts";
import {
  defaultContext,
  defaultDdtOptions,
  foldMerge,
  mergeDdtOptions,
} from "./context.ts";
import { getUi } from "./ext.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

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
  }

  updateOptions(userOptions: UserOptions) {
    this.#options = foldMerge(mergeDdtOptions, defaultDdtOptions, [
      this.#options,
      userOptions,
    ]);
  }
}
