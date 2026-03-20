import { expect, test } from 'vitest';
import { run } from '../codemod.ts';
import { readFileSync } from 'node:fs';

// get fixtures from the file system
const classBackedFixture = readFileSync('./tests/_fixtures/class-backed.gjs', 'utf-8');
const classBackedTsFixture = readFileSync('./tests/_fixtures/class-backed.gts', 'utf-8');
const templateOnlyFixture = readFileSync('./tests/_fixtures/template-only.gjs', 'utf-8');
const templateOnlyTsFixture = readFileSync('./tests/_fixtures/template-only.gts', 'utf-8');
const noImportsFixture = readFileSync('./tests/_fixtures/no-imports.gjs', 'utf-8');

// ---------------------------------------------------------------------------
// class-backed.gjs
// ---------------------------------------------------------------------------

test('class-backed.gjs: removes import from svgJar', () => {
  expect(run(classBackedFixture, './tests/_fixtures/class-backed.gjs')).not.toContain(
    "import svgJar from 'ember-svg-jar/helpers/svg-jar';",
  );
});

test('class-backed.gjs: replaces svgJar usages with icon components', async () => {
  const output = run(classBackedFixture, './tests/_fixtures/class-backed.gjs');
  expect(output).toContain('<OneIcon />');
  expect(output).toContain('<Two class="my-icon" />');
  expect(output).toContain('<SpriteIcon class="my-icon" title="My Icon" />');
  expect(output).toContain('<SomeOtherIcon class={{classHelper "icon-class" "another-class"}} />');
  expect(output).not.toContain('{{svgJar "icon-name"}}');
  expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
  expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon" title}}');
  expect(output).not.toContain(
    '{{svgJar (helper "some-other-icon") class=(classHelper "icon-class" "another-class")}}',
  );

  await expect(output).toMatchFileSnapshot('./_snapshots/class-backed-output.gjs');
});

test('class-backed.gjs: adds new imports for icon components', async () => {
  const output = run(classBackedFixture, './tests/_fixtures/class-backed.gjs');
  expect(output).toContain("import OneIcon from 'my-app/assets/icons/one-icon.svg?unsafe-inline';");
  expect(output).toContain("import Two from 'my-app/assets/icons/two.svg?unsafe-inline';");
  expect(output).toContain("import SpriteIcon from 'my-app/assets/icons/sprite-icon.svg';");
  expect(output).toContain("import SomeOtherIcon from 'my-app/assets/icons/some-other-icon.svg?unsafe-inline';");

  await expect(output).toMatchFileSnapshot('./_snapshots/class-backed-output.gjs');
});

// ---------------------------------------------------------------------------
// class-backed.gts
// ---------------------------------------------------------------------------

test('class-backed.gts: removes import from svgJar', () => {
  expect(run(classBackedTsFixture, './tests/_fixtures/class-backed.gts')).not.toContain(
    "import svgJar from 'ember-svg-jar/helpers/svg-jar';",
  );
});

test('class-backed.gts: replaces svgJar usages with icon components', async () => {
  const output = run(classBackedTsFixture, './tests/_fixtures/class-backed.gts');
  // "icon-name" appears as both inline and sprite, so they get distinct names:
  // inline → IconNameInline, sprite → IconName.
  expect(output).toContain('<IconNameInline />');
  expect(output).toContain('<IconNameInline class="my-icon" />');
  expect(output).toContain('<IconName />');
  expect(output).toContain('<IconName class="my-icon" />');
  expect(output).not.toContain('{{svgJar "icon-name"}}');
  expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
  expect(output).not.toContain('{{svgJar "#icon-name"}}');
  expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon"}}');

  await expect(output).toMatchFileSnapshot('./_snapshots/class-backed-output.gts');
});

test('class-backed.gts: adds new imports for icon components', async () => {
  const output = run(classBackedTsFixture, './tests/_fixtures/class-backed.gts');
  // Both forms are imported with their disambiguated names.
  expect(output).toContain("import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
  expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg';");

  await expect(output).toMatchFileSnapshot('./_snapshots/class-backed-output.gts');
});

// ---------------------------------------------------------------------------
// template-only.gjs
// ---------------------------------------------------------------------------

test('template-only.gjs: removes import from svgJar', () => {
  expect(run(templateOnlyFixture, './tests/_fixtures/template-only.gjs')).not.toContain(
    "import svgJar from 'ember-svg-jar/helpers/svg-jar';",
  );
});

test('template-only.gjs: replaces svgJar usages with icon components', async () => {
  const output = run(templateOnlyFixture, './tests/_fixtures/template-only.gjs');
  // "icon-name" appears as both inline and sprite → disambiguated names.
  expect(output).toContain('<IconNameInline />');
  expect(output).toContain('<IconNameInline class="my-icon" />');
  expect(output).toContain('<IconName />');
  expect(output).toContain('<IconName class="my-icon" />');
  expect(output).not.toContain('{{svgJar "icon-name"}}');
  expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
  expect(output).not.toContain('{{svgJar "#icon-name"}}');
  expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon"}}');

  await expect(output).toMatchFileSnapshot('./_snapshots/template-only-output.gjs');
});

test('template-only.gjs: adds new imports for icon components', async () => {
  const output = run(templateOnlyFixture, './tests/_fixtures/template-only.gjs');
  expect(output).toContain("import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
  expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg';");

  await expect(output).toMatchFileSnapshot('./_snapshots/template-only-output.gjs');
});

// ---------------------------------------------------------------------------
// template-only.gts
// ---------------------------------------------------------------------------

test('template-only.gts: removes import from svgJar', () => {
  expect(run(templateOnlyTsFixture, './tests/_fixtures/template-only.gts')).not.toContain(
    "import svgJar from 'ember-svg-jar/helpers/svg-jar';",
  );
});

test('template-only.gts: replaces svgJar usages with icon components', async () => {
  const output = run(templateOnlyTsFixture, './tests/_fixtures/template-only.gts');
  // "icon-name" appears as both inline and sprite → disambiguated names.
  expect(output).toContain('<IconNameInline />');
  expect(output).toContain('<IconNameInline class="my-icon" />');
  expect(output).toContain('<IconName />');
  expect(output).toContain('<IconName class="my-icon" />');
  expect(output).not.toContain('{{svgJar "icon-name"}}');
  expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
  expect(output).not.toContain('{{svgJar "#icon-name"}}');
  expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon"}}');

  await expect(output).toMatchFileSnapshot('./_snapshots/template-only-output.gts');
});

test('template-only.gts: adds new imports for icon components', async () => {
  const output = run(templateOnlyTsFixture, './tests/_fixtures/template-only.gts');
  expect(output).toContain("import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
  expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg';");

  await expect(output).toMatchFileSnapshot('./_snapshots/template-only-output.gts');
});

// ---------------------------------------------------------------------------
// no imports
// ---------------------------------------------------------------------------

test('no-imports.gjs: handles files with no imports', async () => {
  const output = run(noImportsFixture, './tests/_fixtures/no-imports.gjs');
  // Only one inline icon, no sprite counterpart — plain name, no Inline suffix.
  expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
  expect(output).toContain('<IconName />');
  expect(output).not.toContain('{{svgJar "icon-name"}}');

  await expect(output).toMatchFileSnapshot('./_snapshots/no-imports-output.gjs');
});

// ---------------------------------------------------------------------------
// renamed-import.gjs
// ---------------------------------------------------------------------------

test('renamed-import.gjs: handles custom import names', async () => {
  const output = run(
    readFileSync('./tests/_fixtures/renamed-import.gjs', 'utf-8'),
    './tests/_fixtures/renamed-import.gjs',
  );
  expect(output).toContain('<IconName />');
  expect(output).toContain('<SpriteIcon />');
  expect(output).not.toContain("import myCustomImportName from 'ember-svg-jar/helpers/svg-jar';");
  expect(output).not.toContain('{{myCustomImportName "icon-name"}}');

  await expect(output).toMatchFileSnapshot('./_snapshots/renamed-import-output.gjs');
});
