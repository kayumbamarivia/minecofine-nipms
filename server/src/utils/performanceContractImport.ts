import mammoth from 'mammoth';

export interface ContractObjective {
  id: string;
  objective: string;
  description: string;
}

export interface ContractKpi {
  kpi: string;
  baseline: string;
  target: string;
  actual: string;
  score: string;
  narrative: string;
}

export interface PerformanceContractData {
  companyName: string;
  financialYear: string;
  contractDate: string;
  mandateStatement: string;
  strategicObjectives: ContractObjective[];
  financialKpis: ContractKpi[];
  operationalKpis: ContractKpi[];
  governanceKpis: ContractKpi[];
  overallPerformanceRating: '' | 'below_expectations' | 'meets_expectations' | 'exceeds_expectations';
  chairmanNarrative: {
    keyAchievements: string;
    keyChallengesRisks: string;
    forwardLookingPriorities: string;
  };
}

function stripHtmlTags(value: string): string {
  let result = '';
  let insideTag = false;
  for (const character of value) {
    if (character === '<') {
      insideTag = true;
    } else if (character === '>') {
      insideTag = false;
    } else if (!insideTag) {
      result += character;
    }
  }
  return result;
}

function trimFieldSeparators(value: string): string {
  let start = 0;
  let end = value.length;
  const isSeparator = (character: string) =>
    character === '|' || character === ':' || /\s/.test(character);
  while (start < end && isSeparator(value[start])) start += 1;
  while (end > start && isSeparator(value[end - 1])) end -= 1;
  return value.slice(start, end);
}

function decodeHtml(value: string): string {
  return stripHtmlTags(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanField(value: string): string {
  return trimFieldSeparators(decodeHtml(value).replace(/_{3,}/g, '')).trim();
}

function htmlToLines(html: string): string[] {
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|h1|h2|h3|tr|table)>/gi, '\n');
  return stripHtmlTags(withLineBreaks)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .split(/\r?\n/)
    .map(cleanField)
    .filter(Boolean);
}

function valueFollowingLabel(lines: string[], label: string): string {
  const normalizedLabel = label.toLowerCase();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    const position = lower.indexOf(normalizedLabel);
    if (position < 0) continue;

    const inlineValue = cleanField(line.slice(position + label.length));
    if (inlineValue) return inlineValue;
    const nextLine = cleanField(lines[index + 1] ?? '');
    const isAnotherFieldOrHeading =
      /^(?:company name|financial year|date|mandate statement|key achievements|key challenges|forward-looking priorities|overall performance rating|\d+\.\s|[☐☒☑✓✔■]\s)/i.test(
        nextLine,
      );
    return isAnotherFieldOrHeading ? '' : nextLine;
  }
  return '';
}

function parseRows(tableHtml: string): string[][] {
  return [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) =>
    [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cellMatch) =>
      cleanField(cellMatch[1]),
    ),
  );
}

function parseObjectives(tableHtml = ''): ContractObjective[] {
  return parseRows(tableHtml)
    .slice(1)
    .map((cells) => ({
      id: cells[0] ?? '',
      objective: cells[1] ?? '',
      description: cells[2] ?? '',
    }))
    .filter((row) => row.id || row.objective || row.description);
}

function parseKpis(tableHtml = ''): ContractKpi[] {
  return parseRows(tableHtml)
    .slice(1)
    .map((cells) => ({
      kpi: cells[0] ?? '',
      baseline: cells[1] ?? '',
      target: cells[2] ?? '',
      actual: cells[3] ?? '',
      score: cells[4] ?? '',
      narrative: cells[5] ?? '',
    }))
    .filter((row) =>
      [row.kpi, row.baseline, row.target, row.actual, row.score, row.narrative].some(Boolean),
    );
}

function detectRating(lines: string[]): PerformanceContractData['overallPerformanceRating'] {
  const ratingLine = lines.find((line) =>
    /below expectations|meets expectations|exceeds expectations/i.test(line),
  );
  if (!ratingLine) return '';

  const checked = /[☒☑✓✔■]/;
  const options: Array<[RegExp, PerformanceContractData['overallPerformanceRating']]> = [
    [/[☒☑✓✔■]\s*below expectations/i, 'below_expectations'],
    [/[☒☑✓✔■]\s*meets expectations/i, 'meets_expectations'],
    [/[☒☑✓✔■]\s*exceeds expectations/i, 'exceeds_expectations'],
  ];
  for (const [pattern, value] of options) {
    if (pattern.test(ratingLine)) return value;
  }

  if (checked.test(ratingLine)) return '';

  const typed = valueFollowingLabel(lines, 'Overall Performance Rating');
  if (/^below expectations$/i.test(typed)) return 'below_expectations';
  if (/^meets expectations$/i.test(typed)) return 'meets_expectations';
  if (/^exceeds expectations$/i.test(typed)) return 'exceeds_expectations';
  return '';
}

export async function parsePerformanceContract(
  buffer: Buffer,
): Promise<PerformanceContractData> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  const lines = htmlToLines(html);
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map(
    (match) => match[0],
  );

  if (tables.length < 4 || !lines.some((line) => /performance contract/i.test(line))) {
    throw new Error('This document does not match the Annual Performance Contract template');
  }

  return {
    companyName: valueFollowingLabel(lines, 'Company Name'),
    financialYear: valueFollowingLabel(lines, 'Financial Year'),
    contractDate: valueFollowingLabel(lines, 'Date'),
    mandateStatement: valueFollowingLabel(lines, 'Mandate Statement'),
    strategicObjectives: parseObjectives(tables[0]),
    financialKpis: parseKpis(tables[1]),
    operationalKpis: parseKpis(tables[2]),
    governanceKpis: parseKpis(tables[3]),
    overallPerformanceRating: detectRating(lines),
    chairmanNarrative: {
      keyAchievements: valueFollowingLabel(lines, 'Key Achievements'),
      keyChallengesRisks: valueFollowingLabel(lines, 'Key Challenges & Risks'),
      forwardLookingPriorities: valueFollowingLabel(lines, 'Forward-Looking Priorities'),
    },
  };
}
