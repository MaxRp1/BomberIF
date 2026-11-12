const { homedir } = require('node:os')
const { join, resolve } = require('node:path')

module.exports = {
  webpack: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '#': resolve(__dirname, '..', 'shared')
    },
    configure: webpackConfig => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      )
      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1)
      // CRA já compila client/src com Babel. Este loader é necessário
      // somente para os módulos TypeScript compartilhados fora de client/.
      webpackConfig.module.rules.push({
        test: /\.tsx?$/,
        include: resolve(__dirname, '..', 'shared'),
        loader: 'ts-loader',
        options: {
          configFile: resolve(__dirname, 'tsconfig.json'),
          context: __dirname,
          transpileOnly: true,
          // client/tsconfig.json usa noEmit para typecheck, mas o loader
          // precisa emitir JavaScript para o Webpack.
          compilerOptions: { noEmit: false }
        }
      })
      return webpackConfig
    }
  },
  devServer: {
    https: {
      cert: join(homedir(), '.ssl', 'cert.pem'),
      key: join(homedir(), '.ssl', 'key.pem')
    }
  }
}