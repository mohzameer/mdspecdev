import { computeAstDiffSections } from './src/lib/ast-diff-utils';

async function main() {
    try {
        const sections = await computeAstDiffSections("# My Header", "# My Header");
        console.log(JSON.stringify(sections, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
