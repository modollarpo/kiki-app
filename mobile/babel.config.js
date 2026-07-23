module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['module-resolver', {
      root: __dirname,
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    }],
    ['@babel/plugin-proposal-optional-chaining', { loose: false }],
    ['@babel/plugin-proposal-nullish-coalescing-operator', { loose: false }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-property-initializer', { loose: true }],
    ['@babel/plugin-transform-object-rest-spread', { loose: true }],
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};