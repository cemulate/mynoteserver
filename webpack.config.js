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
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
        ],
      },
      {
        test: /\.(png|jpg|gif|svg|ico)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.txt$/i,
        type: 'asset/source',
      },
    ]
  },
  output: {
    publicPath: '/mynoteserver/app/',
    assetModuleFilename: 'assets/[hash][ext][query]',
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'styles.css' }),
    new HtmlWebpackPlugin({
      meta: { viewport: 'width=device-width, initial-scale=1' },
      template: 'src/index.html',
      title: 'My Notes',
    }),
    new CopyWebpackPlugin({
      patterns: [
        // Need to be able to (not) include these dynamically with script tags
        { from: 'node_modules/reveal.js/dist/reveal.css', to: 'resources/reveal.css' },
        { from: 'node_modules/reveal.js/dist/reveal.js', to: 'resources/reveal.js' },
        { from: 'server/resources/reveal-theme-default.css', to: 'resources/reveal-theme-default.css' },
        { from: 'node_modules/highlight.js/styles/default.css', to: 'resources/highlight-theme-default.css' },
        { from: 'server/resources/config-default.js', to: 'resources/config-default.js' },
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
