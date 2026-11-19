/**
 * Tailwind's generated CSS can carry an `@charset` that lands after the
 * Material theme when Angular combines the stylesheet. The final CSS is pure
 * ASCII, so drop the misplaced declaration after Tailwind has run.
 */
const plugin = () => ({
    postcssPlugin: 'strip-misplaced-charset',
    Once(root) {
        root.walkAtRules('charset', (rule) => rule.remove());
    },
});
plugin.postcss = true;
module.exports = plugin;
