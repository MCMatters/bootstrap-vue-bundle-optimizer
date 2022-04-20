import fs from 'fs';
import vueParser from '@vue/compiler-dom';
import jsParser from '@babel/parser';
import { pascalCase } from 'pascal-case';
import { paramCase } from 'param-case';

export function getNodeModulesPath(path) {
    const pieces = path.split('/');

    while (pieces.length) {
        const candidate = pieces.join('/');

        if (fs.existsSync(`${candidate}/node_modules/bootstrap-vue`)) {
            return `${candidate}/node_modules`;
        }

        pieces.pop();
    }

    throw new Error('Please provide path to the "node_modules" folder');
}

export function getFiles(path, extension = '.vue', files = []) {
    fs.readdirSync(path, { withFileTypes: true }).forEach((item) => {
        if (item.isFile() && item.name.endsWith(extension)) {
            files.push(`${path}/${item.name}`);
        } else if (item.isDirectory()) {
            files = getFiles(`${path}/${item.name}`, extension, files);
        }
    });

    return files;
}

export function getUsedComponents(files) {
    const components = [];

    files.forEach((file) => {
        const fileContent = fs.readFileSync(file, { encoding: 'utf-8' });
        const parsedFile = vueParser.parse(fileContent);
        const template = parsedFile.children.find((child) => child.tag === 'template');

        if (!template) {
            return;
        }

        const compiledTemplate = vueParser.compile(template.loc.source);

        components.push(...compiledTemplate.ast.components);
    });

    return [...new Set(components)];
}

export function getUsedDirectives (files) {
    const directives = [];

    files.forEach((file) => {
        const fileContent = fs.readFileSync(file, { encoding: 'utf-8' });
        const parsedFile = vueParser.parse(fileContent);
        const template = parsedFile.children.find((child) => child.tag === 'template');

        if (!template) {
            return;
        }

        const compiledTemplate = vueParser.compile(template.loc.source);

        directives.push(...compiledTemplate.ast.directives);
    });

    return [...new Set(directives)];
}

export function getBootstrapVueComponents (bootstrapVuePath) {
    const content = fs.readFileSync(`${bootstrapVuePath}/src/constants/components.js`, { encoding: 'utf-8' });
    const ast = jsParser.parse(content, { sourceType: 'module' });
    const names = [];

    ast.program.body.forEach((body) => {
        body.declaration.declarations.forEach((declaration) => {
            names.push(declaration.init.value);
        });
    });

    return names;
}

export function getBootstrapVueDirectives (bootstrapVuePath) {
    const directivesPath = `${bootstrapVuePath}/src/directives`;
    const files = getFiles(directivesPath, '.js');

    const directiveFiles = [];
    const directives = [];

    files.forEach((file) => {
        const path = file.substring(directivesPath.length + 1);
        const pieces = path.split('/');

        if (pieces.length !== 2) {
            return;
        }

        const [name, directive] = pieces;

        if (`${name}.js` === directive) {
            directiveFiles.push(file);
        }
    });

    directiveFiles.forEach((directiveFile) => {
        const content = fs.readFileSync(directiveFile, { encoding: 'utf-8' });
        const ast = jsParser.parse(content, { sourceType: 'module' });

        ast.program.body.forEach((body) => {
            if (body.type !== 'ExportNamedDeclaration') {
                return;
            }

            body.declaration.declarations.forEach((declaration) => {
                directives.push(declaration.id.name);
            });
        });
    });

    return [...new Set(directives)];
}

export function getUsedBootstrapVueComponents (components, bootstrapVueComponents) {
    const used = [];

    components.forEach((component) => {
        component = pascalCase(component);

        if (bootstrapVueComponents.includes(component)) {
            used.push(component);
        }
    });

    return [...new Set(used)].sort();
}

export function getUsedBootstrapVueDirectives (directives, bootstrapVueDirectives) {
    const used = [];

    directives.forEach((directive) => {
        directive = 'V' + pascalCase(directive);

        if (bootstrapVueDirectives.includes(directive)) {
            used.push(directive);
        }
    });

    return [...new Set(used)].sort();
}

export function generateFileContent (components, directives, wrapLimit, indentSize) {
    if (!components.length && !directives.length) {
        return;
    }

    let content = 'import Vue from \'vue\';\n';
    let importContent = 'import { ' + [...components, ...directives].join(', ') + ' } from \'bootstrap-vue\';\n\n';

    if (importContent.length > wrapLimit) {
        const indent = ' '.repeat(indentSize);

        importContent = 'import {\n';
        importContent += [...components, ...directives].map((item) => `${indent}${item}`).join(',\n');
        importContent += ',\n} from \'bootstrap-vue\';\n\n';
    }

    content += importContent

    if (components.length) {
        content += components.map((component) => {
            return `Vue.component('${component}', ${component});`;
        }).join('\n');

        content += '\n';
    }

    if (directives.length) {
        if (components.length) {
            content += '\n';
        }

        content += directives.map((directive) => {
            const name = paramCase(directive).substring(1);

            return `Vue.directive('${name}', ${directive});`;
        }).join('\n');

        content += '\n';
    }

    console.log(content);
}
