/**
 * Named rather than exported anonymously, which is what
 * `import/no-anonymous-default-export` asks for: a default export with no name
 * shows up as `default` in a stack trace and cannot be referred to from a test.
 *
 * The warning was invisible until the ESLint 9 migration, because `next lint`
 * only ever looked inside a fixed set of source directories and never at the
 * configuration files in the root.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
