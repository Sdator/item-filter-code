/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const projectRoot = path.join(__dirname, '..');
const dataOutputRoot = path.join(projectRoot, 'out', 'data');
const dataSourceRoot = path.join(projectRoot, 'build', 'data');
const imageSourceRoot = path.join(projectRoot, 'build', 'images');

const filterDataPath = path.join(dataSourceRoot, 'filter.json');
const filterData = JSON.parse(fs.readFileSync(filterDataPath, 'utf8'));

const sfxDataPath = path.join(dataSourceRoot, 'sfx.json');
const sfxData = JSON.parse(fs.readFileSync(sfxDataPath, 'utf8'));

const uniqueDataPath = path.join(dataSourceRoot, 'uniques.json');
const uniqueData = JSON.parse(fs.readFileSync(uniqueDataPath, 'utf8'));

const modDataPath = path.join(dataSourceRoot, 'mods.json');
const modData = JSON.parse(fs.readFileSync(modDataPath, 'utf8'));

const suggestionDataPath = path.join(dataSourceRoot, 'suggestions.json');
const suggestionData = JSON.parse(fs.readFileSync(suggestionDataPath, 'utf8'));

const itemDataPath = path.join(dataSourceRoot, 'items.json');
const itemData = JSON.parse(fs.readFileSync(itemDataPath, 'utf8'));

mkdirp.sync(dataOutputRoot);

const filterDataContent = JSON.stringify(filterData);
const filterOutputFile = path.join(dataOutputRoot, 'filter.json');
fs.writeFile(filterOutputFile, filterDataContent, err => {
  if (err) throw err;
});

const soundDataContent = JSON.stringify(sfxData);
const soundOutputFile = path.join(dataOutputRoot, 'sfx.json');
fs.writeFile(soundOutputFile, soundDataContent, err => {
  if (err) throw err;
});

const uniqueDataContent = JSON.stringify(uniqueData);
const uniqueOutputFile = path.join(dataOutputRoot, 'uniques.json');
fs.writeFile(uniqueOutputFile, uniqueDataContent, err => {
  if (err) throw err;
});

const suggestionDataContent = JSON.stringify(suggestionData);
const suggestionOutputFile = path.join(dataOutputRoot, 'suggestions.json');
fs.writeFile(suggestionOutputFile, suggestionDataContent, err => {
  if (err) throw err;
});

const modDataContent = JSON.stringify(modData);
const modOutputFile = path.join(dataOutputRoot, 'mods.json');
fs.writeFile(modOutputFile, modDataContent, err => {
  if (err) throw err;
});

// We need to create the following object in memory, then output it to the file:
//  .classesToBases -- essentially the YAML file's object.
//  .basesToClasses -- the list of item bases with their associated class.
//  .classes -- an array containing every class.
//  .sortedBases -- the item bases sorted by their length first, then alphabetical order.
//  .sortedBasesIndices -- the indices for each character length within the sortedBases array.
const itemDataObject = {
  classesToBases: itemData,
  basesToClasses: {},
  classes: [],
  sortedBases: [],
  sortedBasesIndices: []
};

const itemBases = [];

// Fill out basesToClasses as we get the list needed to fill out the last two.
for (const itemClass in itemData) {
  itemDataObject.classes.push(itemClass);
  const classBases = itemData[itemClass];

  for (const itemBase of classBases) {
    itemBases.push(itemBase);
    itemDataObject.basesToClasses[itemBase] = itemClass;
  }
}

itemBases.sort((lha, rha) => {
  if (lha.length > rha.length) {
    return 1;
  } else if (lha.length === rha.length) {
    return lha.localeCompare(rha);
  } else {
    return -1;
  }
});

const maxLength = itemBases[itemBases.length - 1].length;

const indices = [];
let currentIndex = 0;
let currentLength = 1;
while (currentLength <= maxLength) {
  const base = itemBases[currentIndex];
  if (currentLength <= base.length) {
    indices.push(currentIndex);
    currentLength++;
  } else {
    currentIndex++;
  }
}

itemDataObject.sortedBasesIndices = indices;
itemDataObject.sortedBases = itemBases;

const itemDataContent = JSON.stringify(itemDataObject);
const itemDataOutputFile = path.join(dataOutputRoot, 'items.json');
fs.writeFile(itemDataOutputFile, itemDataContent, err => {
  if (err) throw err;
});

// Converts each image used by the extension into the base64 encoding, placing
// that encoding into an outputted JSON file for later use by the extension.

function encodeFile(path) {
  const file = fs.readFileSync(path);
  return new Buffer(file).toString('base64');
}

function walkDirectory(dir, rootDir, fileList) {
  const files = fs.readdirSync(dir);
  if (rootDir == null || fileList == null) {
    rootDir = path.join(dir, path.sep);
    fileList = {};
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fileList = walkDirectory(path.join(filePath, path.sep), rootDir, fileList);
    } else {
      const key = filePath.replace(rootDir, '').replace(/\\/g, '/');
      const value = encodeFile(filePath);
      fileList[key] = value;
    }
  });

  return fileList;
}

const imageData = walkDirectory(imageSourceRoot);
const imageOutputFile = path.join(dataOutputRoot, "images.json");
fs.writeFileSync(imageOutputFile, JSON.stringify(imageData));
