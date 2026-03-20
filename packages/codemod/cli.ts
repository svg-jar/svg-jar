import { Command } from 'commander';
import { intro } from '@clack/prompts';
import packageJson from './package.json' with { type: 'json' };
import pc from 'picocolors';
import { defaultBanner, gradientBanner } from '#lib/banners.ts';

const isInteractive = process.stdout.isTTY && process.stdin.isTTY;
const hasColors = process.stdout.hasColors(8) ?? false;

async function main() {
  const program = new Command();

  program
    .name(packageJson.name)
    .version(packageJson.version)
    .description(packageJson.description)
    .argument('[path]', 'Path to the file or directory to transform (defaults to current directory)', '.')
    .option('-d, --dry-run', 'Run the codemod without making any changes to files')
    .option('-p, --print', 'Print the transformed code to the console instead of writing to files')
    .parse(process.argv);

  const options = program.opts();

  console.log(''); // Add a blank line for better separation from the terminal prompt
  intro(isInteractive && hasColors ? pc.bold(gradientBanner) : defaultBanner);

  // For demonstration purposes, we'll just log the options here.
  // In a real implementation, you would pass these options to your codemod transformation logic.
  console.log('Running codemod with options:', options);
}

main().catch((error) => {
  console.error('An error occurred while running the codemod CLI:', error);
  process.exit(1);
});
