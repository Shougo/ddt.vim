import {
  type BaseParams,
  type DdtOptions,
  type UiOptions,
} from "./types.ts";
import {
  defaultDummy,
  foldMerge,
  mergeUiOptions,
  mergeUiParams,
} from "./context.ts";
import { defaultUiOptions } from "./base/ui.ts";
import type { BaseUi } from "./base/ui.ts";
import type { Loader } from "./loader.ts";
import { printError } from "./utils.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

export async function getUi(
  denops: Denops,
  loader: Loader,
  options: DdtOptions,
): Promise<
  [
    BaseUi<BaseParams> | undefined,
    UiOptions,
    BaseParams,
  ]
> {
  if (!loader.getUi(options.ui)) {
    const exists = await loader.autoload(denops, "ui", options.ui);

    if (options.ui !== "" && !exists) {
      await printError(denops, `Not found ui: "${options.ui}"`);
    }
  }

  const ui = loader.getUi(options.ui);
  if (!ui) {
    return [
      undefined,
      defaultUiOptions(),
      defaultDummy(),
    ];
  }

  const [uiOptions, uiParams] = uiArgs(options, ui);
  await checkUiOnInit(ui, denops, uiOptions, uiParams);

  return [ui, uiOptions, uiParams];
}

function uiArgs<
  Params extends BaseParams,
>(
  options: DdtOptions,
  ui: BaseUi<Params>,
): [UiOptions, BaseParams] {
  const o = foldMerge(
    mergeUiOptions,
    defaultUiOptions,
    [
      options.uiOptions["_"],
      options.uiOptions[ui.name],
    ],
  );
  const p = foldMerge(mergeUiParams, defaultDummy, [
    ui.params(),
    options.uiParams["_"],
    options.uiParams[ui.name],
  ]);
  return [o, p];
}

async function checkUiOnInit(
  ui: BaseUi<BaseParams>,
  denops: Denops,
  uiOptions: UiOptions,
  uiParams: BaseParams,
) {
  if (ui.isInitialized) {
    return;
  }

  try {
    await ui.onInit({
      denops,
      uiOptions,
      uiParams,
    });

    ui.isInitialized = true;
  } catch (e: unknown) {
    await printError(denops, `ui: ${ui.name} "onInit()" failed`, e);
  }
}

