/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// TODO(glen): move these out to data?
export const ruleKeywords = [
  "ItemLevel", "DropLevel", "Quality", "Rarity", "Class", "BaseType", "Sockets",
  "LinkedSockets", "SocketGroup", "Height", "Width", "Identified", "Corrupted",
  "ElderItem", "ShaperItem", "ShapedMap", "SetBorderColor", "SetTextColor",
  "SetBackgroundColor", "PlayAlertSound", "PlayAlertSoundPositional", "SetFontSize"
];

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  ruleWhitelist: string[];
  performanceHints: boolean;
  alwaysShowAlpha: boolean;
}

export interface Point {
  line: number;
  character: number;
}

export interface ItemData {
  classesToBases: { [key: string]: string[] };
  basesToClasses: { [key: string]: string };
  sortedBases: string[];
  sortedBasesIndices: number[];
}
