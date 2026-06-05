const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

const customIdFallbackPattern1 = /\/\/\s*Try\s+(characterId|contextId)\s+first,\s+then\s+_id\n\s*let\s+(\w+)\s*=\s*await\s+(\w+)\.findOne\({\s*(?:\.\.\.filter,\s*)?(characterId|contextId):\s*id\s*}\)(?:\.populate\([^)]+\))?;\n\s*if\s*\(!\2\s*&&\s*mongoose\.isValidObjectId\(id\)\)\s*{\n\s*\2\s*=\s*await\s+\3\.findOne\({\s*(?:\.\.\.filter,\s*)?_id:\s*id\s*}\)(?:\.populate\([^)]+\))?;\n\s*}/g;

const customIdUpdateFallbackPattern = /\/\/\s*Try\s+(?:update|soft delete)\s+by\s+(characterId|contextId)\s+first,\s+then\s+_id\n\s*let\s+(\w+)\s*=\s*await\s+(\w+)\.findOneAndUpdate\(\n\s*{\s*(characterId|contextId):\s*id(?:,[^}]+)?\s*},\n\s*([^,]+),\n\s*({[^}]+})\n\s*\);\n\s*if\s*\(!\2\s*&&\s*mongoose\.isValidObjectId\(id\)\)\s*{\n\s*\2\s*=\s*await\s+\3\.findOneAndUpdate\(\n\s*{\s*_id:\s*id(?:,[^}]+)?\s*},\n\s*([^,]+),\n\s*({[^}]+})\n\s*\);\n\s*}/g;

const customIdDeleteFallbackPattern = /\/\/\s*Try\s+delete\s+by\s+(characterId|contextId)\s+first,\s+then\s+_id\n\s*let\s+(\w+)\s*=\s*await\s+(\w+)\.findOneAndDelete\({\n\s*(characterId|contextId):\s*id,\n\s*}\);\n\s*if\s*\(!\2\s*&&\s*mongoose\.isValidObjectId\(id\)\)\s*{\n\s*\2\s*=\s*await\s+\3\.findOneAndDelete\({\n\s*_id:\s*id,\n\s*}\);\n\s*}/g;

const toggleActiveFindPattern = /\/\/\s*Find\s+by\s+(characterId|contextId)\s+or\s+_id[^\n]*\n\s*let\s+(\w+)\s*=\s*await\s+(\w+)\.findOne\({\s*(characterId|contextId):\s*id\s*}\);\n\s*if\s*\(!\2\s*&&\s*mongoose\.isValidObjectId\(id\)\)\s*{\n\s*\2\s*=\s*await\s+\3\.findOne\({\s*_id:\s*id\s*}\);\n\s*}/g;

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace fallback queries in Services
  content = content.replace(customIdFallbackPattern1, (match, type, varName, modelName, idType) => {
    let populateStr = match.match(/\.populate\([^)]+\)/) ? match.match(/\.populate\([^)]+\)/)[0] : '';
    let filterStr = match.includes('...filter') ? '...filter, ' : '';
    return `if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid ID', 400);\n    const ${varName} = await ${modelName}.findOne({ ${filterStr}_id: id })${populateStr};`;
  });

  content = content.replace(customIdUpdateFallbackPattern, (match, type, varName, modelName, idType, updateQ, opts, updateQ2, opts2) => {
    let extraFilter = match.includes('deletedAt') ? ', deletedAt: { $exists: false } ' : '';
    return `if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid ID', 400);\n    const ${varName} = await ${modelName}.findOneAndUpdate(\n      { _id: id${extraFilter} },\n      ${updateQ},\n      ${opts}\n    );`;
  });

  content = content.replace(customIdDeleteFallbackPattern, (match, type, varName, modelName, idType) => {
    return `if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid ID', 400);\n    const ${varName} = await ${modelName}.findOneAndDelete({ _id: id });`;
  });

  content = content.replace(toggleActiveFindPattern, (match, type, varName, modelName, idType) => {
    return `if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid ID', 400);\n    const ${varName} = await ${modelName}.findOne({ _id: id });`;
  });

  // Replace toggleActive query
  content = content.replace(/const query = \w+\.(characterId|contextId) \? { (characterId|contextId): \w+\.\1 } : { _id: \w+\._id };\n\s*const updated = await (\w+)\.findOneAndUpdate\(\n\s*query,/g, 
    "const updated = await $3.findOneAndUpdate(\n      { _id: $3._id.toString() || id },");

  // Other specific replacements
  content = content.replace(/characterId: character\.characterId \|\| character\._id\.toString\(\)/g, "characterId: character._id.toString()");
  content = content.replace(/contextId: context\.contextId \|\| context\._id\.toString\(\)/g, "contextId: context._id.toString()");
  content = content.replace(/characterId: character\.characterId/g, "characterId: character._id.toString()");
  content = content.replace(/contextId: context\.contextId/g, "contextId: context._id.toString()");

  // findOne({ characterId ...}) => findOne({ _id: characterId ...})
  content = content.replace(/findOne\({ characterId([^:]*):/g, "findOne({ _id: characterId$1:");
  content = content.replace(/findOne\({ contextId([^:]*):/g, "findOne({ _id: contextId$1:");
  // findOne({ characterId, deletedAt... }) 
  content = content.replace(/findOne\({ characterId,/g, "findOne({ _id: characterId,");
  content = content.replace(/findOne\({ contextId,/g, "findOne({ _id: contextId,");

  content = content.replace(/findOneAndUpdate\(\n\s*{ characterId },/g, "findByIdAndUpdate(\n      characterId,");
  content = content.replace(/findOneAndUpdate\(\n\s*{ contextId },/g, "findByIdAndUpdate(\n      contextId,");
  
  // chat.service.ts fallback pattern for $or
  content = content.replace(/\$or: \[\n\s*{ (characterId|contextId) },\n\s*\.\.\.\(mongoose\.isValidObjectId\(\1\) \? \[\{ _id: \1 \}\] : \[\]\),\n\s*\],/g, "_id: $1,");
  content = content.replace(/\$or: \[\{ contextId \}, \.\.\.\(mongoose\.isValidObjectId\(contextId\) \? \[\{ _id: contextId \}\] : \[\]\)\],/g, "_id: contextId,");
  content = content.replace(/\$or: \[\{ contextId: data\.contextId \}, \.\.\.\(mongoose\.isValidObjectId\(data\.contextId\) \? \[\{ _id: data\.contextId \}\] : \[\]\)\],/g, "_id: data.contextId,");

  // Remove `|| id` or `|| ''` from query if any
  content = content.replace(/const query = character\.characterId \? [^;]+;/g, "");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
});
