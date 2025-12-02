module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'plugin:node/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-underscore-dangle': ['error', { allow: ['_id', '_doc'] }],
    'import/extensions': ['error', 'ignorePackages'],
    'node/no-unsupported-features/es-syntax': ['error', {
      ignores: ['modules'],
    }],
    'node/no-missing-import': 'off',
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
  },
};
