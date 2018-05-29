/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Just like in the completion provider, we only need to establish the context
// within the current line.

import * as path from "path";
import { Hover, Position, Range } from "vscode-languageserver";

import { dataRoot } from "../common";
import { UniqueData, UniqueItem, ItemData, FilterData } from "../types";
import * as parser from "./context-parsing";

const itemData = <ItemData>require(path.join(dataRoot, "items.json"));
const filterData = <FilterData>require(path.join(dataRoot, "filter.json"));
const uniqueData = <UniqueData>require(path.join(dataRoot, "uniques.json"));

export function getHoverResult(text: string, position: Position): Hover | null {
  const keywordResult = parser.getKeyword(text, position.line);
  if (!keywordResult) return null;

  const [keyword, keywordRange] = keywordResult;
  const currentIndex = keywordRange.end.character;

  if (keywordRange.start.character > position.character) {
    return null;
  } else if (keywordRange.end.character > position.character) {
    const keywordDescription = filterData.keywordDescriptions[keyword];

    if (keywordDescription) {
      const keywordHover: Hover = {
        contents: keywordDescription,
        range: keywordRange
      };
      return keywordHover;
    } else {
      return null;
    }
  }

  if (keywordRange.end.character >= position.character) return null;

  switch (keyword) {
    case "ItemLevel":
    case "DropLevel":
      return getLevelHover(position, text, currentIndex);
    case "Quality":
      return getQualityHover(position, text, currentIndex);
    case "Sockets":
      return getSocketsHover(position, text, currentIndex);
    case "LinkedSockets":
      return getLinkedSocketsHover(position, text, currentIndex);
    case "Height":
      return getHeightHover(position, text, currentIndex);
    case "Width":
      return getWidthHover(position, text, currentIndex);
    case "Rarity":
      return getRarityHover(position, text, currentIndex);
    case "SocketGroup":
      return getSocketGroupHover(position, text, currentIndex);
    case "Identified":
    case "Corrupted":
    case "ElderItem":
    case "ShaperItem":
    case "ShapedMap":
    case "ElderMap":
    case "DisableDropSound":
      return getBooleanHover(position, text, currentIndex);
    case "Class":
      return getClassHover(position, text, currentIndex);
    case "BaseType":
      return getBaseTypeHover(position, text, currentIndex);
    case "PlayAlertSound":
    case "PlayAlertSoundPositional":
      return getSoundHover(position, text, currentIndex);
    case "SetFontSize":
      return getFontSizeHover(position, text, currentIndex);
    default:
      // We're missing color values, but this is intentional. The color picker
      // in Visual Studio Code becomes very jittery when hover information is
      // provided to it, with it often flipping its anchor orientation completely.
      return null;
  }
}

function getBaseTypeHover(position: Position, text: string, index: number): Hover | null {
  let valueIndex = parser.bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  while (!parser.isNextValue(position, text, valueIndex)) {
    const valueRange = parser.getNextValueRange(text, position.line, valueIndex);
    if (valueRange) {
      valueIndex = valueRange.end.character + 1;
    } else {
      return null;
    }
  }

  const valueRange = parser.getNextValueRange(text, position.line, valueIndex) as Range;
  valueRange.end.character++;
  let baseType = text.slice(valueRange.start.character, valueRange.end.character);

  // The range will include quotation marks, if there are any. We need to get rid
  // of them, as we store items without them in the data files.
  const length = baseType.length;
  const startIndex = baseType[0] === `"` ? 1 : 0;
  const endIndex = baseType[length - 1] === `"` ? length - 1 : length;
  baseType = baseType.slice(startIndex, endIndex);

  // We're essentially buffering directly into a markdown string.
  let output = "";

  const itemClasses: string[] = [];
  const matchedBases: string[] = [];
  for (const itemClass of itemData.classes) {
    const itemBases = itemData.classesToBases[itemClass];
    for (const itemBase of itemBases) {
      if (itemBase.includes(baseType)) {
        if (!itemClasses.includes(itemClass)) itemClasses.push(itemClass);
        matchedBases.push(itemBase);
      }
    }
  }

  if (itemClasses.length === 1) {
    output += `Class: \`${itemClasses[0]}\`\n\n`;
  } else if (itemClasses.length > 1) {
    output += `Classes:`;
    for (const itemClass of itemClasses) {
      output += ` \`${itemClass}\``;
    }

    if (matchedBases.length > 5) {
      output += `\n\nMatched Items: \`${matchedBases.length}\`\n\n`;
    } else if (matchedBases.length > 1) {
      output += "\n\nMatched Items:\n";
      for (const match of matchedBases) {
        output += `- ${match}\n`;
      }
      output += "\n\n";
    }
  }

  const matchedUniques: Array<string|UniqueItem> = [];
  for (const itemBase of matchedBases) {
    const uniques = uniqueData[itemBase];
    if (uniques && uniques.length >= 1) {
      matchedUniques.push.apply(matchedUniques, uniques);
    }
  }

  if (matchedUniques.length >= 1) {
    output += "Uniques:\n";
    let uniquesPushed = 0;
    for (const unique of matchedUniques) {
      if (typeof(unique) === "string") {
        output += `- ${unique}\n`;
      } else {
        output += `- ${unique.name}`;
        if (unique.boss) output += ` \`${unique.boss}\``;
        if (unique.location) output += ` \`${unique.location}\``;
        if (unique.league) output += ` \`${unique.league}\``;
        if (unique.leagues) {
          for (const league of unique.leagues) {
            output += ` \`${league}\``;
          }
        }
        output += "\n";
      }

      uniquesPushed++;
      if (uniquesPushed === 5) {
        if (matchedUniques.length > 5) {
          output += `- ... and ${matchedUniques.length - 5} more.`;
        }
        break;
      }
    }
  }

  if (output === "") {
    return null;
  } else {
    output += "\n\nA base type to be captured by the closing block. As a string value, " +
      "if the base type consists of a multi-word value, then it must be encapsulated " +
      "in quotation marks. This value can be partial, with all item bases containing that " +
      "partial string then being matched.";

    const result: Hover = {
      contents: output,
      range: valueRange
    };

    return result;
  }
}

function getClassHover(position: Position, text: string, index: number): Hover | null {
  let valueIndex = parser.bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  while (!parser.isNextValue(position, text, valueIndex)) {
    const valueRange = parser.getNextValueRange(text, position.line, valueIndex);
    if (valueRange) {
      valueIndex = valueRange.end.character + 1;
    } else {
      return null;
    }
  }

  const valueRange = parser.getNextValueRange(text, position.line, valueIndex) as Range;
  valueRange.end.character++;
  let classType = text.slice(valueRange.start.character, valueRange.end.character);

  // Trim the quotation marks.
  const length = classType.length;
  const startIndex = classType[0] === `"` ? 1 : 0;
  const endIndex = classType[length - 1] === `"` ? length - 1 : length;
  classType = classType.slice(startIndex, endIndex);

  let output = "";

  const matchedClasses: string[] = [];
  for (const itemClass of itemData.classes) {
    if (itemClass.includes(classType)) {
      matchedClasses.push(itemClass);
    }
  }

  let containedItems = 0;
  if (matchedClasses.length === 1) {
    output += `Class \`${matchedClasses[0]}\`\n\n`;
    const items = itemData.classesToBases[matchedClasses[0]];
    if (items !== undefined) containedItems = items.length;
  } else if (matchedClasses.length > 1) {
    output += `Matched Classes:\n`;
    for (const itemClass of matchedClasses) {
      output += `- ${itemClass}\n`;
      const items = itemData.classesToBases[itemClass];
      if (items !== undefined) containedItems += items.length;
    }
    output += "\n";
  }

  if (containedItems > 0) {
    output += `Items: \`${containedItems}\``;
  }

  if (output === "") {
    return null;
  } else {
    output += "\n\nAn item class to be captured by the closing block. As a string value, " +
      "if the item class consists of a multi-word value, then it must be encapsulated " +
      "in quotation marks. This value can be partial, with all item classes containing " +
      "that partial string then being matched.";

    const result: Hover = {
      contents: output,
      range: valueRange
    };

    return result;
  }
}

function getSoundHover(pos: Position, text: string, index: number): Hover | null {
  let result: Hover | null = null;

  const valueIndex = parser.bypassEqOperator(text, index);
  if (valueIndex == null || pos.character < valueIndex) return null;

  if (parser.isNextValue(pos, text, valueIndex)) {
    const range = parser.getNextValueRange(text, pos.line, valueIndex) as Range;
    range.end.character++;
    result = {
      contents: "The identifier for the alert sound, which can either a number " +
        "from 1 to 16 or a string.\n\nThe only current sounds using a string identifier " +
        "would be those in the Shaper set, which includes identifiers such as `ShVaal` " +
        "and `ShMirror`.",
      range
    };
  } else { // if is the value after that..
    const firstValueRange = parser.getNextValueRange(text, pos.line, valueIndex);
    if (firstValueRange == null) return result;

    if (parser.isNextValue(pos, text, firstValueRange.end.character + 1)) {
      const range = parser.getNextValueRange(text, pos.character, valueIndex) as Range;
      range.end.character++;
      result = {
        contents: "The volume level for the alert sound, which can be a number from 0 to 300.",
        range
      };
    }
  }

  return result;
}

function getLevelHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "A level, which can be any number from 0 to 100.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getSocketsHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The number of sockets on the item, which can be any number from 0 to 6.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getQualityHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The quality of the item, which can be any number from 0 to 30.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getLinkedSocketsHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The number of linked sockets on the item, which can be either " +
    "0 or a number from 2 to 6.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getHeightHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The height of the item within the inventory, which can be a " +
    "number from 1 to 4.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getWidthHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The height of the item within the inventory, which can be a " +
    "number from 1 to 2.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getRarityHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The rarity of the item, which is a string such as `Rare` or `Unique`.";
  return getSingleValueHover(pos, text, index, contents, false);
}

function getSocketGroupHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "The colors of the sockets within the item, with each character of " +
  "the string representing the color of a single socket.\n\n" +
  "The most common socket group being `RGB`, which indicates that the item " +
  "has one red socket, one green socket, and one blue socket. The second most " +
  "common socket group being `WWWWWW`, which indicates that the item has six " +
  "white sockets.";
  return getSingleValueHover(pos, text, index, contents, true);
}

function getBooleanHover(pos: Position, text: string, index: number): Hover | null {
  const contents = "A boolean with two possible values: `True` or `False`.";
  return getSingleValueHover(pos, text, index, contents, true);
}

function getFontSizeHover(pos: Position, text: string, index: number): Hover | null {
  const content = "The size to use for the font, which can be any number from 18 to 45.";
  return getSingleValueHover(pos, text, index, content, true);
}

function getSingleValueHover(pos: Position, text: string, index: number, contents: string,
  equalityOnly: boolean): Hover | null {

  let result: Hover | null = null;

  const valueIndex = equalityOnly ? parser.bypassEqOperator(text, index) :
    parser.bypassOperator(text, index);

  if (valueIndex != null && pos.character >= valueIndex) {
    if (parser.isNextValue(pos, text, valueIndex)) {
      const range = parser.getNextValueRange(text, pos.line, valueIndex) as Range;
      range.end.character++;
      result = {
        contents,
        range
      };
    }
  }

  return result;
}
