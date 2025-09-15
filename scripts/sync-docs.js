#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para sincronizar documentação automática com Docusaurus
 */

// Lê o arquivo API markdown gerado pelo API Documenter
function processApiDocumentation() {
  const apiReportPath = path.join(__dirname, '../temp/flow-test-engine.api.md');
  const outputPath = path.join(__dirname, '../website/docs/api-auto/');

  // Criar diretório se não existir
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Ler o relatório da API
  if (!fs.existsSync(apiReportPath)) {
    console.log('⚠️  Arquivo de API report não encontrado. Execute npm run docs:extract primeiro.');
    return;
  }

  const apiContent = fs.readFileSync(apiReportPath, 'utf8');

  // Processar o conteúdo para criar páginas específicas
  const sections = parseApiReport(apiContent);

  // Gerar índice automático
  generateAutoIndex(sections, outputPath);

  // Gerar páginas individuais para cada classe/interface
  generateIndividualPages(sections, outputPath);

  console.log('✅ Documentação automática gerada com sucesso!');
  console.log(`📁 Arquivos gerados em: ${outputPath}`);
  console.log(`📊 Classes: ${sections.classes.length}`);
  console.log(`📋 Interfaces: ${sections.interfaces.length}`);
  console.log(`🔧 Funções: ${sections.functions.length}`);
}

function parseApiReport(content) {
  const sections = {
    interfaces: [],
    classes: [],
    functions: [],
    types: []
  };

  // Extrair classes do conteúdo
  const classMatches = content.match(/export class (\w+)/g) || [];
  classMatches.forEach(match => {
    const name = match.replace('export class ', '');
    sections.classes.push({
      name,
      content: extractClassContent(content, name),
      description: extractDescription(content, name)
    });
  });

  // Extrair interfaces
  const interfaceMatches = content.match(/export interface (\w+)/g) || [];
  interfaceMatches.forEach(match => {
    const name = match.replace('export interface ', '');
    sections.interfaces.push({
      name,
      content: extractInterfaceContent(content, name),
      description: extractDescription(content, name)
    });
  });

  // Extrair funções
  const functionMatches = content.match(/export function (\w+)/g) || [];
  functionMatches.forEach(match => {
    const name = match.replace('export function ', '');
    sections.functions.push({
      name,
      content: extractFunctionContent(content, name),
      description: extractDescription(content, name)
    });
  });

  return sections;
}

function extractClassContent(content, className) {
  const pattern = new RegExp(`export class ${className}[\\s\\S]*?(?=export|$)`, 'g');
  const match = content.match(pattern);
  return match ? match[0].trim() : '';
}

function extractInterfaceContent(content, interfaceName) {
  const pattern = new RegExp(`export interface ${interfaceName}[\\s\\S]*?(?=export|$)`, 'g');
  const match = content.match(pattern);
  return match ? match[0].trim() : '';
}

function extractFunctionContent(content, functionName) {
  const pattern = new RegExp(`export function ${functionName}[\\s\\S]*?(?=export|$)`, 'g');
  const match = content.match(pattern);
  return match ? match[0].trim() : '';
}

function extractDescription(content, name) {
  // Procurar por comentários no conteúdo
  const lines = content.split('\n');
  let description = '';

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(name)) {
      // Procurar comentários acima
      for (let j = i - 1; j >= 0; j--) {
        const line = lines[j].trim();
        if (line.startsWith('//') && line.includes('undocumented')) {
          continue;
        }
        if (line.startsWith('//')) {
          description = line.replace('//', '').trim();
          break;
        }
        if (line === '') continue;
        break;
      }
      break;
    }
  }

  return description || `Documentação automática para ${name}`;
}

function generateAutoIndex(sections, outputPath) {
  const indexContent = `---
sidebar_position: 1
---

# Referência da API (Auto-gerada)

Esta documentação é gerada automaticamente a partir do código TypeScript usando API Extractor.

${sections.classes.length > 0 ? `
## Classes Principais

${sections.classes.map(cls => `- [${cls.name}](./${cls.name.toLowerCase()}) - ${cls.description}`).join('\n')}
` : ''}

${sections.interfaces.length > 0 ? `
## Interfaces

${sections.interfaces.map(iface => `- [${iface.name}](./${iface.name.toLowerCase()}) - ${iface.description}`).join('\n')}
` : ''}

${sections.functions.length > 0 ? `
## Funções Utilitárias

${sections.functions.map(func => `- [${func.name}](./${func.name.toLowerCase()}) - ${func.description}`).join('\n')}
` : ''}

## Como Atualizar Esta Documentação

Para atualizar esta documentação automática:

1. Adicione comentários TSDoc no código fonte
2. Execute \`npm run docs:extract\` para extrair a API
3. Execute \`npm run docs:sync\` para sincronizar com Docusaurus

## Comandos Disponíveis

\`\`\`bash
# Processo completo
npm run docs:full

# Apenas extrair API
npm run docs:extract

# Apenas sincronizar
npm run docs:sync
\`\`\`

---

*Documentação gerada automaticamente em ${new Date().toLocaleString('pt-BR')}*
`;

  fs.writeFileSync(path.join(outputPath, 'index.md'), indexContent);
}

function generateIndividualPages(sections, outputPath) {
  // Gerar páginas para classes
  sections.classes.forEach((cls, index) => {
    const content = generateClassPage(cls, index + 2);
    fs.writeFileSync(path.join(outputPath, `${cls.name.toLowerCase()}.md`), content);
  });

  // Gerar páginas para interfaces
  sections.interfaces.forEach((iface, index) => {
    const content = generateInterfacePage(iface, sections.classes.length + index + 2);
    fs.writeFileSync(path.join(outputPath, `${iface.name.toLowerCase()}.md`), content);
  });

  // Gerar páginas para funções
  sections.functions.forEach((func, index) => {
    const content = generateFunctionPage(func, sections.classes.length + sections.interfaces.length + index + 2);
    fs.writeFileSync(path.join(outputPath, `${func.name.toLowerCase()}.md`), content);
  });
}

function generateClassPage(cls, sidebarPosition) {
  return `---
sidebar_position: ${sidebarPosition}
---

# ${cls.name}

${cls.description}

## Definição TypeScript

\`\`\`typescript
${cls.content}
\`\`\`

## Exemplo de Uso

\`\`\`typescript
import { ${cls.name} } from 'flow-test-engine';

// Criar instância da classe
const instance = new ${cls.name}();

// Usar métodos disponíveis
// (consulte a definição acima para métodos específicos)
\`\`\`

---

*Esta página foi gerada automaticamente a partir do código fonte. Para mais detalhes sobre implementação, consulte os arquivos TypeScript no diretório \`src/\`.*
`;
}

function generateInterfacePage(iface, sidebarPosition) {
  return `---
sidebar_position: ${sidebarPosition}
---

# ${iface.name}

${iface.description}

## Definição TypeScript

\`\`\`typescript
${iface.content}
\`\`\`

## Exemplo de Implementação

\`\`\`typescript
import { ${iface.name} } from 'flow-test-engine';

// Implementar a interface
const exemplo: ${iface.name} = {
  // Preencher propriedades conforme definição acima
  // ...
};
\`\`\`

---

*Esta página foi gerada automaticamente a partir do código fonte. Para mais detalhes sobre implementação, consulte os arquivos TypeScript no diretório \`src/\`.*
`;
}

function generateFunctionPage(func, sidebarPosition) {
  return `---
sidebar_position: ${sidebarPosition}
---

# ${func.name}

${func.description}

## Definição TypeScript

\`\`\`typescript
${func.content}
\`\`\`

## Exemplo de Uso

\`\`\`typescript
import { ${func.name} } from 'flow-test-engine';

// Usar a função
const resultado = ${func.name}(/* parâmetros conforme definição */);
\`\`\`

---

*Esta página foi gerada automaticamente a partir do código fonte. Para mais detalhes sobre implementação, consulte os arquivos TypeScript no diretório \`src/\`.*
`;
}

// Executar o script
if (require.main === module) {
  processApiDocumentation();
}