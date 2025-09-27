const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: process.env.NODE_ENV === 'test' ? './src/test-plugin.ts' : 
           process.env.NODE_ENV === 'simple' ? './src/simple-test.ts' :
           process.env.NODE_ENV === 'minimal' ? './src/minimal-test.ts' : './src/index.ts',
    mode: argv.mode || 'development',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.js',
      clean: true
    },
    target: 'web',
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource'
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    externals: {
      '@logseq/libs': 'logseq'
    },
    optimization: {
      minimize: isProduction
    }
  };
};
