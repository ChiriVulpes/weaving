module.exports = /** @type {import("eslint").Linter.BaseConfig & import("@typescript-eslint/utils").TSESLint.Linter.Config} */ ({
	extends: "../.eslintrc.js",
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ["./tsconfig.json"],
	},
});