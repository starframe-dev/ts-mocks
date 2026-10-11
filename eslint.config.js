import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
    eslint.configs.recommended,
    tseslint.configs.strict,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
            semi: ['error', 'never'],
            indent: ['error', 4],
        },
    },
)
