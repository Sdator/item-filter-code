/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as cp from "child_process";
import * as path from "path";
import * as vscode from "vscode";

import { dataOutputRoot, sfxRoot, toolsRoot } from "../../common";
import { SoundEffectData } from "../../common/types";
import { PlayDefaultSoundOptions, PlayCustomSoundOptions } from "../types";

const soundData = require(path.join(dataOutputRoot, "sfx.json")) as SoundEffectData;

export function registerPlaySound(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("item-filter.playDefaultSound",
      ({ id, volume }: PlayDefaultSoundOptions) => {
        playDefaultSound(id, parseInt(volume, 10));
      }),
    vscode.commands.registerCommand("item-filter.playCustomSound",
      ({ path }: PlayCustomSoundOptions) => {
        playCustomSound(path);
      })
  );
}

function playDefaultSound(identifier: string, volume: number) {
  // Sound identifiers can be whitelisted, so just don't attempt to play any
  // sounds that we don't bundle.
  const soundFilePart = soundData[identifier];
  const soundPath = path.join(sfxRoot, soundFilePart);

  // GGG uses a scale of 0 to 300 for volume.
  const percentage = volume / 300;

  const result = determinePlayer(soundPath, percentage);
  if (result) {
    const [player, args] = result;
    cp.execFile(player, args);
  }
}

function playCustomSound(path: string): void {
  const result = determinePlayer(path, 1);

  if (result) {
    const [player, args] = result;
    cp.execFile(player, args);
  }
}

function determinePlayer(soundPath: string, volumePercentage: number):
  [string, string[]] | undefined {

  // MPG123 uses a scale of 0 to 32768 in order to scale volume.
  const scaledSamples = Math.trunc(32768 * volumePercentage);

  let player: string;
  let args: string[];

  if (process.platform === "win32") {
    const mpgPath = path.join(toolsRoot, "mpg123.exe");
    player = mpgPath;
    args = ["-q", "-f", `${scaledSamples}`, soundPath];
  } else if (process.platform === "linux") {
    const availability = <boolean>vscode.workspace.getConfiguration("item-filter")
      .get("linuxMPGAvailable");
    const mpgPath = <string>vscode.workspace.getConfiguration("item-filter")
      .get("linuxMPGPath");

    if (mpgPath && mpgPath !== "") {
      player = mpgPath;
    } else if (availability) {
      player = "mpg123";
    } else {
      return undefined;
    }

    args = ["-q", "-f", `${scaledSamples}`, soundPath];
  } else if (process.platform === "darwin") {
    // afplay uses 0.0 to 1.0, so we're good on volume. This uses a different
    // method of scaling volume than mpg123, so it may or may not be more
    // accurate to what GGG itself does with the client.
    const volume = volumePercentage;
    player = "afplay";
    args = ["-v", `${volume}`, soundPath];
  } else {
    return undefined;
  }

  return [player, args];
}
