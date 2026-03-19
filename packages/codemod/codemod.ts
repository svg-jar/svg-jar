import { z, type Collection, type FilteredCollection, type NodePath } from 'zmod';
import { emberParser } from 'zmod-ember';
import type { GlimmerExpression, GlimmerHashPair, GlimmerMustacheStatement } from './glimmer-types.ts';

const j = z.withParser(emberParser);

type IconType = 'inline' | 'sprite';

interface UsedIcon {
  /** PascalCase component name derived from the icon slug, e.g. "OneIcon" */
  componentName: string;
  /** Kebab-case icon slug with the leading # stripped, e.g. "one-icon" */
  iconSlug: string;
  /** Whether the icon is rendered inline (SVG markup) or as a sprite (<use>) */
  type: IconType;
}

/**
 * Converts a kebab-case string to PascalCase.
 * Used to derive a component name from an icon slug.
 *
 * @example "one-icon" → "OneIcon"
 */
function toPascalCase(str: string): string {
  return str.replace(/(^\w|-\w)/g, (match) => match.replace(/-/, '').toUpperCase());
}

/**
 * Determines whether an icon is inline SVG or a sprite reference.
 * ember-svg-jar uses a leading "#" to denote sprite icons.
 *
 * @example "one-icon"   → 'inline'
 * @example "#sprite-icon" → 'sprite'
 */
function determineIconType(rawIconName: string): IconType {
  return rawIconName.startsWith('#') ? 'sprite' : 'inline';
}

/**
 * Extracts the raw icon name string from the first parameter of a svgJar
 * mustache call. Handles two forms:
 *
 *   - String literal:   {{svgJar "icon-name"}}  → "icon-name"
 *   - Sub-expression:   {{svgJar (helper "icon-name")}}  → "icon-name"
 *
 * Returns undefined if the icon name cannot be statically determined.
 */
function extractRawIconName(firstParam: GlimmerExpression | undefined): string | undefined {
  if (firstParam?.type === 'GlimmerStringLiteral') {
    return firstParam.value;
  }

  if (firstParam?.type === 'GlimmerSubExpression') {
    const subFirstParam = firstParam.params[0];
    if (subFirstParam?.type === 'GlimmerStringLiteral') {
      return subFirstParam.value;
    }
  }

  return undefined;
}

/**
 * Serialises a single Glimmer hash pair value into the appropriate HTML/HBS
 * attribute syntax for use in an angle-bracket component invocation.
 *
 * The four cases mirror what Glimmer can express as a hash value:
 *
 *   GlimmerStringLiteral  → key="value"
 *   GlimmerBooleanLiteral → key  (true, bare attribute)  /  key={{false}}  (false)
 *   GlimmerPathExpression → key={{identifier}}
 *   GlimmerSubExpression  → key={{helper arg1 arg2}}
 *
 * For the sub-expression case the original source text is sliced directly
 * using the node's byte offsets, stripping the surrounding `()` parens that
 * Handlebars uses for sub-expressions (they are not needed inside `{{}}`).
 */
function serialiseHashPairValue(key: string, value: GlimmerExpression, source: string): string {
  switch (value.type) {
    case 'GlimmerStringLiteral':
      return `${key}="${value.value}"`;

    case 'GlimmerBooleanLiteral':
      return value.value ? key : `${key}={{false}}`;

    case 'GlimmerPathExpression':
      return `${key}={{${value.original}}}`;

    case 'GlimmerSubExpression': {
      // Strip the surrounding `(` `)` from the sub-expression source slice.
      const inner = source.slice(value.start + 1, value.end - 1);
      return `${key}={{${inner}}}`;
    }
  }
}

/**
 * Builds an angle-bracket component invocation string from a component name
 * and the hash pairs collected from the original mustache call.
 *
 * @example
 *   buildComponentTag('OneIcon', [], source)
 *   // → '<OneIcon />'
 *
 * @example
 *   buildComponentTag('Two', [{ key: 'class', value: ... }], source)
 *   // → '<Two class="my-icon" />'
 */
function buildComponentTag(componentName: string, hashPairs: GlimmerHashPair[], source: string): string {
  if (hashPairs.length === 0) {
    return `<${componentName} />`;
  }

  const attrs = hashPairs.map(({ key, value }) => serialiseHashPairValue(key, value, source)).join(' ');

  return `<${componentName} ${attrs} />`;
}

/**
 * Builds the import path for an icon component.
 *
 * Inline icons append `?unsafe-inline` to opt into SVG markup injection.
 * Sprite icons use a plain path since they reference a `<symbol>` in a sprite
 * sheet and don't need to embed markup.
 *
 * @example "one-icon", 'inline'  → "my-app/assets/icons/one-icon.svg?unsafe-inline"
 * @example "sprite-icon", 'sprite' → "my-app/assets/icons/sprite-icon.svg"
 */
function buildIconImportPath(iconSlug: string, type: IconType): string {
  const suffix = type === 'inline' ? '?unsafe-inline' : '';
  return `my-app/assets/icons/${iconSlug}.svg${suffix}`;
}

/**
 * Replaces every `{{svgJar ...}}` mustache call in the template with the
 * equivalent angle-bracket component invocation, e.g. `<OneIcon />`.
 *
 * Returns a Map of component name → UsedIcon for every distinct icon
 * encountered. Using a Map keyed by component name naturally deduplicates:
 * if the same icon is used multiple times, the second set() is a no-op
 * because the key already exists.
 *
 * Mustaches whose icon name cannot be statically resolved are left unchanged.
 */
function replaceMustachesWithComponents(svgJarUsages: FilteredCollection, source: string): Map<string, UsedIcon> {
  const usedIcons = new Map<string, UsedIcon>();

  svgJarUsages.replaceWith((path: NodePath) => {
    const node = path.node as GlimmerMustacheStatement;
    const rawName = extractRawIconName(node.params[0]);

    // Skip mustaches we can't statically analyse (e.g. fully dynamic icon names)
    if (!rawName) {
      return node;
    }

    const iconSlug = rawName.replace(/^#/, '');
    const componentName = toPascalCase(iconSlug);

    usedIcons.set(componentName, { componentName, iconSlug, type: determineIconType(rawName) });

    return buildComponentTag(componentName, node.hash?.pairs ?? [], source);
  });

  return usedIcons;
}

/**
 * Inserts an import declaration for each icon component collected during the
 * mustache replacement pass, positioned after the last existing import in the
 * file.
 */
function addIconImports(root: Collection, usedIcons: Map<string, UsedIcon>): void {
  const allImports = root.find(j.ImportDeclaration);

  // FilteredCollection.at() does not support negative indices, so use length - 1
  const lastImport = allImports.at(allImports.length - 1);

  for (const { componentName, iconSlug, type } of usedIcons.values()) {
    const importPath = buildIconImportPath(iconSlug, type);
    lastImport?.insertAfter(`\nimport ${componentName} from '${importPath}';`);
  }
}

/**
 * Transforms a single .gjs/.gts file, migrating all `ember-svg-jar` usage to
 * direct SVG component imports.
 *
 * Steps performed:
 *   1. Parse the file with the Glimmer-aware ember parser.
 *   2. Find all `{{svgJar "..."}}` mustache calls in templates.
 *   3. Replace each with an angle-bracket component invocation.
 *   4. Remove the `ember-svg-jar` import declaration.
 *   5. Add a new import for each icon component used.
 *
 * @param source   Raw source text of the file.
 * @param filePath Path to the file (used by the parser to select JS vs TS mode).
 * @returns        Transformed source text.
 */
export function run(source: string, filePath: string): string {
  const root = j(source, { filePath });

  const svgJarImport = root.find(j.ImportDeclaration, { source: { value: 'ember-svg-jar' } });

  // Read the local identifier used for the default import (typically "svgJar",
  // but could be anything the user chose when they wrote the import).
  const identifier = svgJarImport.find(j.ImportDefaultSpecifier).get().node.local.name;

  const svgJarUsages = root.find('GlimmerMustacheStatement', {
    path: { original: identifier },
  });

  const usedIcons = replaceMustachesWithComponents(svgJarUsages, source);

  svgJarImport.remove();

  addIconImports(root, usedIcons);

  return root.toSource();
}
