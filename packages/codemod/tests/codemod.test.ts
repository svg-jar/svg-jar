import { expect, test } from 'vitest';
import { run } from '../codemod.ts';
import { readFileSync } from 'node:fs';

// get fixtures from the file system
const classBackedFixture = readFileSync('./tests/_fixtures/class-backed.gjs', 'utf-8');
// const classBackedTsFixture = readFileSync('./tests/_fixtures/class-backed.gts', 'utf-8');
// const templateOnlyFixture = readFileSync('./tests/_fixtures/template-only.gjs', 'utf-8');
// const templateOnlyTsFixture = readFileSync('./tests/_fixtures/template-only.gts', 'utf-8');

test('removes import from svgJar', () => {
  expect(run(classBackedFixture, './tests/_fixtures/class-backed.gjs')).not.toContain(
    "import svgJar from 'ember-svg-jar';",
  );
});

test('replaces svgJar usages with icon components', () => {
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
});

test('adds new imports for icon components', () => {
  const output = run(classBackedFixture, './tests/_fixtures/class-backed.gjs');
  expect(output).toContain("import OneIcon from 'my-app/assets/icons/one-icon.svg?unsafe-inline';");
  expect(output).toContain("import Two from 'my-app/assets/icons/two.svg?unsafe-inline';");
  expect(output).toContain("import SpriteIcon from 'my-app/assets/icons/sprite-icon.svg';");
  expect(output).toContain("import SomeOtherIcon from 'my-app/assets/icons/some-other-icon.svg?unsafe-inline';");
});
