/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv();

const projectRoot = path.join(__dirname, '..');
const dataSourceRoot = path.join(projectRoot, 'build', 'data');
const dataOutputRoot = path.join(projectRoot, 'out', 'data');
const schemaRoot = path.join(projectRoot, 'out', 'schemas');

const pairings = [
  ['filter.json', path.join(dataSourceRoot, 'filter.json')],
  ['items-source.json', path.join(dataSourceRoot, 'items.json')],
  ['items-generated.json', path.join(dataOutputRoot, 'items.json')],
  ['mods.json', path.join(dataSourceRoot, 'mods.json')],
  ['sfx.json', path.join(dataSourceRoot, 'sfx.json')],
  ['suggestions.json', path.join(dataSourceRoot, 'suggestions.json')],
  ['uniques.json', path.join(dataSourceRoot, 'uniques.json')],
  ['parser-inputs.json', path.join(dataSourceRoot, 'parsers', 'GGG.json')]
];

for (const pair of pairings) {
  const schemaPath = path.join(schemaRoot, pair[0]);
  const jsonPath = pair[1];

  const schemaFile = fs.readFileSync(schemaPath);
  const jsonFile = fs.readFileSync(jsonPath);

  const validate = ajv.compile(JSON.parse(schemaFile));
  if (!validate(JSON.parse(jsonFile))) {
    throw new Error(`JSON file "${pair[1]}" contains errors.`);
  }
}
