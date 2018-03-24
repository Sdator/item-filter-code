/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Just like in the completion provider, we only need to establish the context
// within the current line.

import * as path from "path";
import { Hover, Position } from "vscode-languageserver";

import { dataRoot } from "../common";
import { UniqueData, UniqueItem, ItemData, FilterData } from "../types";
import { bypassEqOperator, getKeyword, getStringRangeAtPosition } from "./utilities";

const itemData: ItemData = require(path.join(dataRoot, "items.json"));
const filterData: FilterData = require(path.join(dataRoot, "filter.json"));
const uniqueData: UniqueData = require(path.join(dataRoot, "uniques.json"));

export function getHoverResult(text: string, position: Position): Hover | null {
  const keywordResult = getKeyword(text, position.line);
  if (!keywordResult) return null;

  const [keyword, keywordRange] = keywordResult;
  const currentIndex = keywordRange.end.character;

  if (keywordRange.start.character > position.character) return null;
  else if (keywordRange.end.character > position.character) {
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
    case "BaseType":
      return getBaseTypeHover(position, text, currentIndex);
    case "Class":
      return getClassHover(position, text, currentIndex);
    default:
      return null;
  }
}

function getBaseTypeHover(position: Position, text: string, index: number): Hover | null {
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  const valueRange = getStringRangeAtPosition(position, text, valueIndex);
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
    const result: Hover = {
      contents: output,
      range: valueRange
    };

    return result;
  }
}

function getClassHover(position: Position, text: string, index: number): Hover | null {
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  const valueRange = getStringRangeAtPosition(position, text, valueIndex);
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
    const result: Hover = {
      contents: output,
      range: valueRange
    };

    return result;
  }
}
