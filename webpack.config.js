const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const cssPlugin = new ExtractTextPlugin('[name].css')

const config = {
  entry: [
    'webpack/hot/dev-server',
    'webpack-dev-server/client?http://localhost:3000',
    `${__dirname}/src/BlipChat.js`
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'blip-chat.js',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader'
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /(node_modules|bower_components)/,
        include: /src/,
        loader: 'eslint-loader'
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader!css-loader'
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader' // creates style nodes from JS strings
          },
          {
            loader: 'css-loader' // translates CSS into CommonJS
          },
          {
            loader: 'sass-loader' // compiles Sass to CSS
          }
        ]
      },
      {
        test: /\.(jpe?g|gif|svg|cur)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
              name: 'img/[name].[ext]?[hash]'
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.png$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
              mimetype: 'image/png',
              name: 'img/[name].[ext]?[hash]'
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              query: { minimize: true }
            }
          }
        ]
      }
    ]
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    watchContentBase: true
  },
  node: {
    hot: process.env.NODE_ENV === 'production',
    inline: true,
    progress: true,
    colors: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
      }
    }),
    cssPlugin
  ]
}

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    new webpack.LoaderOptionsPlugin({
      debug: false
    }),
  )
} else {
  config.plugins.push(new webpack.HotModuleReplacementPlugin())
  config.plugins.push(
    new webpack.LoaderOptionsPlugin({
      debug: true
    }),
  )
  config.plugins.push(
    new HtmlWebpackPlugin({
      filename: 'index.html',
      pkg: require('./package.json'),
      template: './index.html',
      inject: 'body'
    }),
  )
}

 module.exports = config
