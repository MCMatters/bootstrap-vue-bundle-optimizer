import * as functions from './functions.js';

const args = process.argv.slice(2);

if (args.length < 1) {
    throw new Error('Please provide path to the folder with vue files');
}

const path = args[0].replace(/\/$/, '');
const bootstrapVuePath = (args[1] || functions.getNodeModulesPath(path)) + '/bootstrap-vue';
const wrapLimit = Number(args[2] || 80);
const indentSize = Number(args[3] || 2);

const bootstrapVueComponents = functions.getBootstrapVueComponents(bootstrapVuePath);
const bootstrapVueDirectives = functions.getBootstrapVueDirectives(bootstrapVuePath);

const files = functions.getFiles(path);

const usedComponents = functions.getUsedComponents(files);
const usedBootstrapVueComponents = functions.getUsedBootstrapVueComponents(usedComponents, bootstrapVueComponents);

const usedDirectives = functions.getUsedDirectives(files);
const usedBootstrapVueDirectives = functions.getUsedBootstrapVueDirectives(usedDirectives, bootstrapVueDirectives);

functions.generateFileContent(usedBootstrapVueComponents, usedBootstrapVueDirectives, wrapLimit, indentSize);
