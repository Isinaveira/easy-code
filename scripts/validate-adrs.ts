import fs from 'fs';
import path from 'path';

const ADR_DIR = path.join(process.cwd(), 'docs/adr');

const REQUIRED_HEADERS = [
  '## Estado',
  '## Fecha',
  '## Autor',
  '## Especificaciones relacionadas',
  '## Tareas relacionadas',
  '## Commits relacionados',
  '## Contexto',
  '## Problema',
  '## Alternativas consideradas',
  '## Decisión',
  '## Consecuencias',
  '### Positivas',
  '### Negativas',
  '## Trabajo futuro'
];

function validateADRs() {
  const files = fs.readdirSync(ADR_DIR).filter(f => f.startsWith('ADR-') && f.endsWith('.md') && f !== 'ADR-template.md');
  
  let hasErrors = false;
  const numbers = new Set<number>();

  files.forEach(file => {
    // Validate name format: ADR-XXX-something.md or ADR-XXXX-something.md
    const match = file.match(/^ADR-(\d{3,4})-(.+)\.md$/);
    if (!match) {
      console.error(`❌ [Error] Invalid ADR filename: ${file}. Expected format: ADR-XXXX-kebab-case-name.md`);
      hasErrors = true;
      return;
    }

    const num = parseInt(match[1], 10);
    if (numbers.has(num)) {
      console.error(`❌ [Error] Duplicate ADR number: ${num} in ${file}`);
      hasErrors = true;
    }
    numbers.add(num);

    // ADRs before ADR-008 (SPEC-005) are grandfathered in and don't strictly require the new headers
    if (num < 8) {
      return;
    }

    // Validate headers
    const content = fs.readFileSync(path.join(ADR_DIR, file), 'utf-8');
    for (const header of REQUIRED_HEADERS) {
      if (!content.includes(header)) {
        console.error(`❌ [Error] Missing required header "${header}" in ${file}`);
        hasErrors = true;
      }
    }
  });

  // Verify sequential numbering
  if (numbers.size > 0) {
    const max = Math.max(...Array.from(numbers));
    if (numbers.size !== max) {
      console.warn(`⚠️ [Warning] ADR numbers are not perfectly sequential. Max is ${max} but there are ${numbers.size} ADRs.`);
    }
  }

  if (hasErrors) {
    console.error('\n💥 ADR Validation failed.');
    process.exit(1);
  } else {
    console.log(`✅ All ${files.length} ADRs passed validation.`);
  }
}

validateADRs();
