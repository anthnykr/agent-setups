import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["node_modules/**"] },
	...tseslint.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
);
