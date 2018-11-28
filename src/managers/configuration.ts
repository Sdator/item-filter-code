/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { Disposable, Emitter, Event, IDisposable } from "../kits/events";
import { ConfigurationValues } from "../types";

/** Type information for the ConfigurationManager's Emitter. */
interface Emissions {
  /** Emitted whenever the configuration has changed. */
  "change": ConfigurationValues;
}

/**
 * A simple wrapper around the Visual Studio Code configuration API, providing
 * an easy and consistent access to our configuration values.
 *
 * This does not support folder-level configuration values.
 */
export class ConfigurationManager implements IDisposable {
  private readonly _emitter: Emitter<Emissions>;
  private readonly _subscription: IDisposable;

  values: ConfigurationValues;

  constructor() {
    this._emitter = new Emitter();
    this._subscription = vscode.workspace.onDidChangeConfiguration(this._change, this);
    this.values = this._updateValues();
  }

  /** Disposes of this manager and all of its subscriptions. */
  dispose(): void {
    this._subscription.dispose();
    this._emitter.dispose();
  }

  /**
   * Invoke the given callback whenever the configuration has changed within
   * Visual Studio Code.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidChange: Event<Emissions["change"]> = (e, preempt, thisArg) => {
    return this._emitter.on("change", e, preempt, thisArg);
  }

  /** Queries Visual Studio Code in order to retrieve a fully up-to-date configuration. */
  private _updateValues(): ConfigurationValues {
    const config = vscode.workspace.getConfiguration("item-filter");

    const baseWhitelist = config.get<string[]>("baseWhitelist");
    const classWhitelist = config.get<string[]>("classWhitelist");
    const ruleWhitelist = config.get<string[]>("ruleWhitelist");
    const soundWhitelist = config.get<string[]>("soundWhitelist");
    const modWhitelist = config.get<string[]>("modWhitelist");
    const performanceHints = config.get<boolean>("performanceHints");
    const limitedModPool = config.get<boolean>("limitedModPool");
    const itemValueQuotes = config.get<boolean>("itemValueQuotes");
    const booleanQuotes = config.get<boolean>("booleanQuotes");
    const rarityQuotes = config.get<boolean>("rarityQuotes");
    const modQuotes = config.get<boolean>("modQuotes");
    const linuxMPGAvailable = config.get<boolean>("linuxMPGAvailable");
    const linuxMPGPath = config.get<string>("linuxMPGPath");
    const verifyCustomSounds = config.get<boolean>("verifyCustomSounds");
    const windowsDocumentFolder = config.get<string>("windowsDocumentFolder");

    return {
      baseWhitelist: baseWhitelist ? baseWhitelist : [],
      classWhitelist: classWhitelist ? classWhitelist : [],
      ruleWhitelist: ruleWhitelist ? ruleWhitelist : [],
      soundWhitelist: soundWhitelist ? soundWhitelist : [],
      modWhitelist: modWhitelist ? modWhitelist : [],
      performanceHints: performanceHints == null ? true : performanceHints,
      itemValueQuotes: itemValueQuotes == null ? true : itemValueQuotes,
      booleanQuotes: booleanQuotes == null ? false : booleanQuotes,
      rarityQuotes: rarityQuotes == null ? false : rarityQuotes,
      modQuotes: modQuotes == null ? true : modQuotes,
      linuxMPGAvailable: linuxMPGAvailable == null ? false : linuxMPGAvailable,
      linuxMPGPath: linuxMPGPath == null ? "" : linuxMPGPath,
      verifyCustomSounds: verifyCustomSounds == null ? true : verifyCustomSounds,
      windowsDocumentFolder: windowsDocumentFolder == null ? "" : windowsDocumentFolder
    };
  }

  /** Updates the configuration values, emitting the result to any listeners. */
  private _change(event: vscode.ConfigurationChangeEvent): void {
    if (!event.affectsConfiguration("item-filter")) {
      return;
    }

    this.values = this._updateValues();
    this._emitter.emit("change", this.values);
  }
}
