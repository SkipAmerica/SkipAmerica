module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'import'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    
    // Enforce folder discipline
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Prevent features from importing from each other directly
          {
            target: './src/features/!(shared)/**/*',
            from: './src/features/!(shared)/**/*',
            except: ['../shared/**/*'],
            message: 'Features should not import from other features directly. Use shared/* instead.'
          },
          // Prevent app layer from importing features
          {
            target: './src/app/**/*',
            from: './src/features/**/*',
            message: 'App layer should not import from features. Use routing and providers instead.'
          },
          // Prevent shared from importing features or app
          {
            target: './src/shared/**/*',
            from: './src/features/**/*',
            message: 'Shared code cannot depend on feature-specific code.'
          },
          {
            target: './src/shared/**/*',
            from: './src/app/**/*',
            message: 'Shared code cannot depend on app-specific code.'
          }
        ]
      }
    ],
    
    // Prevent circular dependencies
    'import/no-cycle': ['error', { maxDepth: 10 }],
    
    // Enforce import order
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index']
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['builtin']
      }
    ],
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-as-const': 'error',
    
    // Performance rules
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    }
  }
}