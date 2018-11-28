/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Generates JSON schemas from our TypeScript files, allowing us to validate
// JSON files directly against those types.

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const TJS = require('typescript-json-schema');

const projectRoot = path.join(__dirname, '..');
const schemaOutputDir = path.join(projectRoot, 'out', 'schemas');

const options = {
  noExtraProps: true,
  required: true
};

const schemas = [
  {
    sourceFilePath: path.join(projectRoot, 'src', 'types', 'parser-inputs.ts'),
    type: 'FilterParseData',
    outputFileName: 'parser-inputs.json'
  }
];

mkdirp(schemaOutputDir);

for (const e of schemas) {
  const file = e.sourceFilePath;
  const program = TJS.getProgramFromFiles([path.resolve(file)]);
  const schema = TJS.generateSchema(program, e.type, options);
  const outputFile = path.join(schemaOutputDir, e.outputFileName);

  fs.writeFileSync(outputFile, JSON.stringify(schema));
}
