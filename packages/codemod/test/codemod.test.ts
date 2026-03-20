import { describe, it, expect } from 'vitest';
import { run } from '../codemod.ts';
import { readFixture } from './helpers.ts';

const classBackedFixture = readFixture('class-backed.gjs');
const classBackedTsFixture = readFixture('class-backed.gts');
const templateOnlyFixture = readFixture('template-only.gjs');
const templateOnlyTsFixture = readFixture('template-only.gts');
const noImportsFixture = readFixture('no-imports.gjs');
const renamedImportFixture = readFixture('renamed-import.gjs');

describe('class-backed.gjs', () => {
  const output = run(classBackedFixture, './test/_fixtures/class-backed.gjs');

  it('removes import from svgJar', () => {
    expect(output).not.toContain("import svgJar from 'ember-svg-jar/helpers/svg-jar';");
  });

  it('replaces svgJar usages with icon components', () => {
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

  it('adds new imports for icon components', () => {
    expect(output).toContain("import OneIcon from 'my-app/assets/icons/one-icon.svg?unsafe-inline';");
    expect(output).toContain("import Two from 'my-app/assets/icons/two.svg?unsafe-inline';");
    expect(output).toContain("import SpriteIcon from 'my-app/assets/icons/sprite-icon.svg';");
    expect(output).toContain("import SomeOtherIcon from 'my-app/assets/icons/some-other-icon.svg?unsafe-inline';");
  });
});

describe('class-backed.gts', () => {
  // "icon-name" appears as both inline and sprite, so they get distinct names:
  // inline → IconNameInline, sprite → IconName.
  const output = run(classBackedTsFixture, './test/_fixtures/class-backed.gts');

  it('removes import from svgJar', () => {
    expect(output).not.toContain("import svgJar from 'ember-svg-jar/helpers/svg-jar';");
  });

  it('replaces svgJar usages with icon components', () => {
    expect(output).toContain('<IconNameInline />');
    expect(output).toContain('<IconNameInline class="my-icon" />');
    expect(output).toContain('<IconName />');
    expect(output).toContain('<IconName class="my-icon" />');
    expect(output).not.toContain('{{svgJar "icon-name"}}');
    expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
    expect(output).not.toContain('{{svgJar "#icon-name"}}');
    expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon"}}');
  });

  it('adds new imports for icon components', () => {
    expect(output).toContain("import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
    expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg';");
  });
});

describe('template-only.gjs', () => {
  // "icon-name" appears as both inline and sprite → disambiguated names.
  const output = run(templateOnlyFixture, './test/_fixtures/template-only.gjs');

  it('removes import from svgJar', () => {
    expect(output).not.toContain("import svgJar from 'ember-svg-jar/helpers/svg-jar';");
  });

  it('replaces svgJar usages with icon components', () => {
    expect(output).toContain('<IconNameInline />');
    expect(output).toContain('<IconNameInline class="my-icon" />');
    expect(output).toContain('<IconName />');
    expect(output).toContain('<IconName class="my-icon" />');
    expect(output).not.toContain('{{svgJar "icon-name"}}');
    expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
    expect(output).not.toContain('{{svgJar "#icon-name"}}');
    expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon"}}');
  });

  it('adds new imports for icon components', () => {
    expect(output).toContain("import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
    expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg';");
  });
});

describe('template-only.gts', () => {
  // "icon-name" appears as both inline and sprite → disambiguated names.
  const output = run(templateOnlyTsFixture, './test/_fixtures/template-only.gts');

  it('removes import from svgJar', () => {
    expect(output).not.toContain("import svgJar from 'ember-svg-jar/helpers/svg-jar';");
  });

  it('replaces svgJar usages with icon components', () => {
    expect(output).toContain('<IconNameInline />');
    expect(output).toContain('<IconNameInline class="my-icon" />');
    expect(output).toContain('<IconName />');
    expect(output).toContain('<IconName class="my-icon" />');
    expect(output).not.toContain('{{svgJar "icon-name"}}');
    expect(output).not.toContain('{{svgJar "icon-name" class="my-icon"}}');
    expect(output).not.toContain('{{svgJar "#icon-name"}}');
    expect(output).not.toContain('{{svgJar "#icon-name" class="my-icon"}}');
  });

  it('adds new imports for icon components', () => {
    expect(output).toContain("import IconNameInline from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
    expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg';");
  });
});

describe('no-imports.gjs', () => {
  // Only one inline icon, no sprite counterpart — plain name, no Inline suffix.
  const output = run(noImportsFixture, './test/_fixtures/no-imports.gjs');

  it('handles files with no imports', () => {
    expect(output).toContain("import IconName from 'my-app/assets/icons/icon-name.svg?unsafe-inline';");
    expect(output).toContain('<IconName />');
    expect(output).not.toContain('{{svgJar "icon-name"}}');
  });
});

describe('renamed-import.gjs', () => {
  const output = run(renamedImportFixture, './test/_fixtures/renamed-import.gjs');

  it('handles custom import names', () => {
    expect(output).toContain('<IconName />');
    expect(output).toContain('<SpriteIcon />');
    expect(output).not.toContain("import myCustomImportName from 'ember-svg-jar/helpers/svg-jar';");
    expect(output).not.toContain('{{myCustomImportName "icon-name"}}');
  });
});
