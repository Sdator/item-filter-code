/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "vscode";

import * as commonTypes from "../../common/types";

export interface ConfigurationValues extends commonTypes.ConfigurationValues {
  linuxMPGAvailable: boolean;
  linuxMPGPath: string;
}

export interface PlayDefaultSoundOptions {
  id: string;
  volume: string;
}

export interface PlayCustomSoundOptions {
  path: string;
}

export interface SoundInformation {
  knownIdentifier: boolean;
  identifier: string;
  volume: number;
  range: Range;
}
