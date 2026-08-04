import {
  ActionFlags,
  type BaseParams,
  type Context,
  type DdtOptions,
  type UiOptions,
} from "./types.ts";
import {
  defaultDummy,
  foldMerge,
  mergeParams,
  mergeUiOptions,
} from "./context.ts";
import { defaultUiOptions } from "./base/ui.ts";
import type { BaseUi } from "./base/ui.ts";
import type { Loader } from "./loader.ts";
import { printError } from "./utils.ts";

import type { Denops } from "@denops/std";
import { Lock } from "@core/asyncutil/lock";

const initLocks = new Map<string, Lock<unknown>>();

function getInitLock(name: string): Lock<unknown> {
  let lock = initLocks.get(name);
  if (!lock) {
    lock = new Lock(0);
    initLocks.set(name, lock);
  }
  return lock;
}

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
  const name = options.ui;
  if (name.length === 0) {
    return [
      undefined,
      defaultUiOptions(),
      defaultDummy(),
    ];
  }

  const ui = await loader.getUi(denops, name);
  if (!ui) {
    await printError(
      denops,
      `Not found ui: "${name}"`,
    );

    return [
      undefined,
      defaultUiOptions(),
      defaultDummy(),
    ];
  }

  const [uiOptions, uiParams] = uiArgs(options, ui);

  await getInitLock(ui.name).lock(async () => {
    await checkUiOnInit(ui, denops, options, uiOptions, uiParams);
  });

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
  const p = foldMerge(mergeParams, defaultDummy, [
    ui.params(),
    options.uiParams["_"],
    options.uiParams[ui.name],
  ]);
  return [o, p];
}

export async function uiAction(
  denops: Denops,
  loader: Loader,
  context: Context,
  options: DdtOptions,
  actionName: string,
  actionParams: BaseParams,
): Promise<
  [
    BaseUi<BaseParams> | undefined,
    UiOptions,
    BaseParams,
    ActionFlags,
  ]
> {
  // Quit current UI
  const [ui, uiOptions, uiParams] = await getUi(
    denops,
    loader,
    options,
  );
  if (!ui) {
    return [undefined, uiOptions, uiParams, ActionFlags.None];
  }

  const action = uiOptions.actions[actionName] ??
    ui.actions[actionName]?.callback;
  if (!action) {
    await printError(denops, `Not found UI action: ${actionName}`);
    return [undefined, uiOptions, uiParams, ActionFlags.None];
  }

  const args = {
    denops,
    context,
    options,
    uiOptions,
    uiParams,
    actionParams,
  };
  const ret = typeof action === "string"
    ? await denops.call("denops#callback#call", action, args) as ActionFlags
    : await action(args);

  return [ui, uiOptions, uiParams, ret];
}

async function checkUiOnInit(
  ui: BaseUi<BaseParams>,
  denops: Denops,
  options: DdtOptions,
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

    // Set $EDITOR only after init succeeded.
    await denops.call("ddt#ui#_set_editor", options.nvimServer);

    ui.isInitialized = true;
  } catch (e: unknown) {
    await printError(denops, `ui: ${ui.name} "onInit()" failed`, e);
  }
}
