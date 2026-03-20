import { z, type Collection, type FilteredCollection, type NodePath } from 'zmod';
import { emberParser } from 'zmod-ember';
import type { GlimmerExpression, GlimmerHashPair, GlimmerMustacheStatement } from './types/glimmer-types.ts';

const j = z.withParser(emberParser);

type IconType = 'inline' | 'sprite';

/**
 * A composite key that uniquely identifies an icon by both its slug and type.
 * This allows the same slug used as both inline and sprite to be tracked
 * as two distinct entries.
 *
 * @example "icon-name:inline" | "icon-name:sprite"
 */
type IconKey = `${string}:${IconType}`;

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
 * @example "one-icon"     → 'inline'
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
 * Pre-scans all svgJar mustache calls to collect the full set of (slug, type)
 * pairs used in the file, then resolves any name conflicts.
 *
 * Conflict rule: when the same slug appears as both inline and sprite, the
 * sprite gets the plain PascalCase name (e.g. "IconName") and the inline
 * variant gets an "Inline" suffix (e.g. "IconNameInline").
 *
 * Returns a Map keyed by IconKey ("slug:type") → UsedIcon, which the
 * replacement pass uses to look up the resolved component name for each call.
 */
function resolveIconNames(svgJarUsages: FilteredCollection): Map<IconKey, UsedIcon> {
  // First, collect every distinct (slug, type) pair encountered.
  const entries = new Map<IconKey, UsedIcon>();

  svgJarUsages.forEach((path: NodePath) => {
    const node = path.node as GlimmerMustacheStatement;
    const rawName = extractRawIconName(node.params[0]);
    if (!rawName) return;

    const iconSlug = rawName.replace(/^#/, '');
    const type = determineIconType(rawName);
    const key: IconKey = `${iconSlug}:${type}`;

    if (!entries.has(key)) {
      // Assign the plain PascalCase name initially; conflicts are resolved below.
      entries.set(key, { componentName: toPascalCase(iconSlug), iconSlug, type });
    }
  });

  // Detect conflicts: same slug appearing as both inline and sprite.
  // When a conflict exists, the sprite keeps the plain name and the inline
  // variant is suffixed with "Inline".
  for (const [key, icon] of entries) {
    if (icon.type === 'inline') {
      const spriteKey: IconKey = `${icon.iconSlug}:sprite`;
      if (entries.has(spriteKey)) {
        entries.set(key, { ...icon, componentName: `${icon.componentName}Inline` });
      }
    }
  }

  return entries;
}

/**
 * Replaces every `{{svgJar ...}}` mustache call in the template with the
 * equivalent angle-bracket component invocation, e.g. `<OneIcon />`.
 *
 * Uses the pre-resolved icon name map so that conflict disambiguation
 * (IconName vs IconNameInline) is already settled before any replacement runs.
 *
 * Mustaches whose icon name cannot be statically resolved are left unchanged.
 */
function replaceMustachesWithComponents(
  svgJarUsages: FilteredCollection,
  resolvedIcons: Map<IconKey, UsedIcon>,
  source: string,
): void {
  svgJarUsages.replaceWith((path: NodePath) => {
    const node = path.node as GlimmerMustacheStatement;
    const rawName = extractRawIconName(node.params[0]);

    // Skip mustaches we can't statically analyse (e.g. fully dynamic icon names)
    if (!rawName) {
      return node;
    }

    const iconSlug = rawName.replace(/^#/, '');
    const type = determineIconType(rawName);
    const key: IconKey = `${iconSlug}:${type}`;
    const icon = resolvedIcons.get(key);

    // Should always be present since resolveIconNames saw the same usages,
    // but guard defensively to avoid a runtime crash.
    if (!icon) {
      return node;
    }

    return buildComponentTag(icon.componentName, node.hash?.pairs ?? [], source);
  });
}

/**
 * Inserts an import declaration for each icon component collected during the
 * pre-scan pass.
 *
 * If the file already has imports, the new ones are inserted after the last
 * existing import. If there are no imports at all (e.g. a bare template-only
 * component with no JS), the imports are prepended at the top of the file.
 */
function addIconImports(root: Collection, usedIcons: Map<IconKey, UsedIcon>): void {
  const allImports = root.find(j.ImportDeclaration);

  if (allImports.length > 0) {
    // FilteredCollection.at() does not support negative indices, so use length - 1
    const lastImport = allImports.at(allImports.length - 1);
    for (const { componentName, iconSlug, type } of usedIcons.values()) {
      const importPath = buildIconImportPath(iconSlug, type);
      lastImport?.insertAfter(`\nimport ${componentName} from '${importPath}';`);
    }
  } else {
    // No existing imports — prepend all icon imports at the top of the file.
    const lines = [...usedIcons.values()]
      .map(
        ({ componentName, iconSlug, type }) => `import ${componentName} from '${buildIconImportPath(iconSlug, type)}';`,
      )
      .join('\n');
    root.insertAt(0, lines + '\n\n');
  }
}

/**
 * Transforms a single .gjs/.gts file, migrating all `ember-svg-jar` usage to
 * direct SVG component imports.
 *
 * Steps performed:
 *   1. Parse the file with the Glimmer-aware ember parser.
 *   2. Pre-scan all `{{svgJar "..."}}` calls to collect icon slugs/types and
 *      resolve any name conflicts (same slug used as both inline and sprite
 *      gets distinct names: IconName / IconNameInline).
 *   3. Replace each mustache with the resolved angle-bracket component tag.
 *   4. Remove the `ember-svg-jar` import declaration.
 *   5. Add a new import for each distinct icon component used.
 *
 * @param source   Raw source text of the file.
 * @param filePath Path to the file (forwarded to the parser for language detection).
 * @returns        Transformed source text.
 */
export function run(source: string, filePath: string): string {
  const root = j(source, { filePath });

  const svgJarImport = root.find(j.ImportDeclaration, { source: { value: 'ember-svg-jar/helpers/svg-jar' } });

  // Read the local identifier from the import when present (typically "svgJar",
  // but could be any alias the user chose). Fall back to "svgJar" when there is
  // no import declaration — e.g. template-only files that rely on the helper
  // being in scope without an explicit import.
  const importSpecifier = svgJarImport.find(j.ImportDefaultSpecifier);
  const identifier: string = importSpecifier.length > 0 ? importSpecifier.get().node.local.name : 'svgJar';

  const svgJarUsages = root.find('GlimmerMustacheStatement', {
    path: { original: identifier },
  });

  // Pre-scan: collect all (slug, type) pairs and resolve name conflicts before
  // any mutations are made. This ensures the same slug used as both inline and
  // sprite gets distinct names (e.g. IconName / IconNameInline).
  const resolvedIcons = resolveIconNames(svgJarUsages);

  replaceMustachesWithComponents(svgJarUsages, resolvedIcons, source);

  // Only attempt to remove the import if one was actually found.
  if (svgJarImport.length > 0) {
    svgJarImport.remove();
  }

  addIconImports(root, resolvedIcons);

  return root.toSource();
}
