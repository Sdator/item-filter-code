/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// The most accurate way to actually provide autocompletions for an item filter
// is to simply parse the entire line in order to figure out the context. We
// don't have to worry about other lines at all with item filters, which makes
// this fast and easy. This also means that we don't have to wait for data from
// the item filter parser, as we can parse independently.
//
// Filtering suggestions based on block constraints would be intrusive and
// is better handled through diagnostics.

import {
  CompletionItem, CompletionItemKind, Position, Range, TextDocument
} from "vscode-languageserver";

import { ruleKeywords } from "./common";

/**
 * Synchronously returns completion suggestions for at the position in the given
 * text document.
 * @param document The document to provide completion suggestions for.
 * @param position The context within the document to provide suggestions for.
 */
export function getCompletionSuggestions(document: TextDocument, position: Position):
  CompletionItem[] {

  const result: CompletionItem[] = [];
  const lines = document.getText().split(/\r?\n/g);
  const lineText = lines[position.line];

  const whitespaceRegex = /^\s*$/;
  const whitespaceCharacterRegex = /\s/;
  const keywordRegex = /^\s*[A-Z]+(?=\s|$)/i;
  const hasKeyword = keywordRegex.test(lineText);

  if (hasKeyword) {
    return result;
  } else {
    const isEmpty = whitespaceRegex.test(lineText);

    if (isEmpty) return getKeywordCompletions(position);

    let foundContent = false;
    let contentStartIndex: number | undefined;
    for (let i = 0; i <= position.character; i++) {
      const character = lineText.charAt(i);
      if (whitespaceCharacterRegex.test(character)) {
        // The position is preceded by some unknown entity, so we cant provide
        // any meaningful suggestions.
        if (foundContent) return result;
      } else {
        if (foundContent) continue;
        foundContent = true;
        contentStartIndex = i;
      }
    }

    if (foundContent) {
      // This is a very rare case. It's when we're editing an invalid keyword
      // into a valid one and request autocompletion results. For instance,
      // we might have "BaseT|42" as the value, where | is the position. Note
      // that "BaseT| 42" would be caught by a case above.
      //
      // Other packages generally don't provide completions for this case, so
      // we wont either.
      return result;
    } else {
      // Stuff towards the end of the line, with a request for completions at
      // the beginning.
      return getKeywordCompletions(position);
    }
  }
}

function keywordToCompletionItem(text: string, range: Range): CompletionItem {
  return {
    label: text,
    kind: CompletionItemKind.Property,
    textEdit: {
      newText: text,
      range
    }
  };
}

function getKeywordCompletions(pos: Position): CompletionItem[] {
  const result: CompletionItem[] = [];
  const range: Range = {
    start: { line: pos.line, character: pos.character },
    end: { line: pos.line, character: pos.character }
  };

  for (const k of ruleKeywords) {
    result.push(keywordToCompletionItem(k, range));
  }

  return result;
}

function getFilteredKeywordCompletions(pos: Position, text: string, range: Range):
  CompletionItem[] {

  const result: CompletionItem[] = [];

  for (const k of ruleKeywords) {
    if (k.includes(text)) {
      result.push(keywordToCompletionItem(k, range));
    }
  }

  return result;
}

function getStringContext(text: string, offset: number, position: Position):
  [boolean, number] {

  const textToPosition = text.substr(0, position.character - offset)
  let stringOpened = false;
  let stringStart: number = -1;

  for (let i = 0; i < textToPosition.length; i++) {
    const character = text.charAt(i);

    if (character === '"') {
      if (stringOpened) {
        stringOpened = false;
        stringStart = -1;
      } else {
        stringOpened = true;
        stringStart = i;
      }
    }
  }

  return [stringOpened, stringStart];
}
