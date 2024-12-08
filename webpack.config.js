const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  entry: process.env.NODE_ENV == 'development' ? ['webpack-hot-middleware/client', './src/index.js'] : './src/index.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/i,
        type: 'asset/resource',
      },
    ]
  },
  output: {
    publicPath: '/app/',
    assetModuleFilename: 'assets/[hash][ext][query]',
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'styles.css' }),
    new HtmlWebpackPlugin({
      meta: { viewport: 'width=device-width, initial-scale=1' },
      template: 'src/index.html',
      title: 'My Notes',
      meta: { viewport: 'width=device-width,initial-scale=1' },
      favicon: 'src/assets/favicon.svg',
    }),
    new CopyWebpackPlugin({
      patterns: [
        // Need to be able to (not) include these dynamically with script tags
        { from: 'node_modules/reveal.js/dist/reveal.css', to: 'resources/reveal.css' },
        { from: 'node_modules/reveal.js/dist/reveal.js', to: 'resources/reveal.js' },
      ],
    }),
    new VueLoaderPlugin(),
    new InjectManifest({
      swSrc: './src/service-worker.js',
      maximumFileSizeToCacheInBytes: 1024*1024*10,
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};
