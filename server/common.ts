/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// TODO(glen): Move these out to data.
export const rules = [
  "ItemLevel", "DropLevel", "Quality", "Rarity", "Class", "BaseType", "Sockets",
  "LinkedSockets", "SocketGroup", "Height", "Width", "Identified", "Corrupted",
  "ElderItem", "ShaperItem", "ShapedMap", "SetBorderColor", "SetTextColor",
  "SetBackgroundColor", "PlayAlertSound", "PlayAlertSoundPositional", "SetFontSize"
];

// TODO(glen): Move these out to data.
export const sounds = {
  numberIdentifier: {
    min: 1,
    max: 16
  },
  stringIdentifiers: [
    ["ShGeneral", "General"],
    ["ShBlessed", "Blessed Orb"],
    ["ShChaos", "Chaos Orb"],
    ["ShDivine", "Divine Orb"],
    ["ShExalted", "Exalted Orb"],
    ["ShMirror", "Mirror of Kalandra"],
    ["ShAlchemy", "Orb of Alchemy"],
    ["ShFusing", "Orb of Fusing"],
    ["ShRegal", "Regal Orb"],
    ["ShVaal", "Vaal Orb"]
  ]
};

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  ruleWhitelist: string[];
  soundWhitelist: string[];
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
