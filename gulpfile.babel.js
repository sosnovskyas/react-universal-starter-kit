'use strict';

import gulp from "gulp";
import gulplog from "gulplog";
import path from "path";
import del from "del";
import gulpIf from "gulp-if";
import named from "vinyl-named";
import plumber from "gulp-plumber";
import notify from "gulp-notify";
import browserSync from "browser-sync";
import webpackStream from "webpack-stream";
import nodemon from "gulp-nodemon";

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';
const webpack = webpackStream.webpack;

// PATHS config
let paths = {
  src: 'src',
  dest: {
    client: 'dist/public',
    server: 'dist'
  },
  assets: 'src/assets/**'
};

// client config
paths.client = {
  js: paths.src + '/client/*.js'
};

// server config
paths.server = {
  js: paths.src + '/server/index.js'
};

// webpack options
let options;

// developer options
options = {
  watch: isDevelopment,
  devtool: isDevelopment ? 'cheap-module-inline-source-map' : null
};

// filenames
options.output = {
  filename: 'bundle.js'
};

// modules
options.module = {
  loaders: [{
    test: /\.js$/,
    exclude: /node_modules/,
    include: path.join(__dirname, paths.src),
    loader: 'babel'
  }]
};

// plugins
options.plugins = [
  new webpack.NoErrorsPlugin()
];

/*
*   TASKS
* */

// CLEAN
gulp.task('clean', function() {
  return del(['dist']);
});

// nodemon
gulp.task('nodemon', function (callback) {
  let started = false;
  return nodemon({
    script: './dist/server.js',
    ext: '*.js *.jsx'
  })
    .on('start', function () {
      if (!started) {
        started = true;
        setTimeout(function reload() {
            callback();
          },
          500
        );
      }
    })
    .on('restart', function onRestart() {
      setTimeout(function reload() {
          browserSync.reload({
            stream: false
          });
        },
        500
      );
    });
});

// serve
gulp.task('browsersync', ['nodemon'], function () {
  browserSync.init({
    proxy: "http://localhost:5000",
    files: ["./dist/**/*"],
    browser: "google chrome",
    port: 3000
  });
});

// assets
gulp.task('assets', () => {
  gulp.src(paths.assets)
    .pipe(gulp.dest(paths.dest.client))
});

// JS
gulp.task('js:client', (callback)=> {
  let first = false;

  function done(err/*, stats*/) {
    // first = true;
    if (err) {
      return;
    }
    // console.log('DONE', stats);
  }

  // task
  return gulp.src(paths.client.js)
    .pipe(plumber({
      errorHandler: notify.onError(err=>({
        title: 'Webpack',
        message: err.message
      }))
    }))
    .pipe(webpackStream(options, null, done))
    .pipe(gulp.dest(paths.dest.client))
    .on('data', ()=> {
      if (first) {
        callback();
      }
    })
});
gulp.task('js:server', (callback)=> {
  let first = false;

  function done(err/*, stats*/) {
    if (err) {
      return;
    }
    // console.log('DONE', stats);
  }

  return gulp.src(paths.server.js)
    .pipe(plumber({
      errorHandler: notify.onError(err=>({
        title: 'Webpack',
        message: err.message
      }))
    }))
    .pipe(webpackStream(options, null, done))
    .pipe(gulp.dest(paths.dest.server))
    .on('data', ()=> {
      if (first) {
        callback();
      }
    })
});

// WEBPACK
gulp.task('webpack:client', function(callback) {
  let firstBuildReady = false;

  function done(err, stats) {
    firstBuildReady = true;

    if (err) { // hard error, see https://webpack.github.io/docs/node.js-api.html#error-handling
      return;  // emit('error', err) in webpack-stream
    }

    gulplog[stats.hasErrors() ? 'error' : 'info'](stats.toString({
      colors: true
    }));

  }

  let options = {
    output: {
      publicPath: '/',
      // filename: isDevelopment ? '[name].js' : '[name]-[chunkhash:10].js'
      filename: 'bundle.js'
    },
    watch:   isDevelopment,
    devtool: isDevelopment ? 'cheap-module-inline-source-map' : null,
    module:  {
      loaders: [{
        test:    /\.js$/,
        include: path.join(__dirname, "src"),
        loader:  'babel?presets[]=es2015'
      }]
    },
    plugins: [
      new webpack.NoErrorsPlugin()
    ]
  };

  if (!isDevelopment) {
    options.plugins.push(new AssetsPlugin({
      filename: 'webpack.json',
      path:     __dirname + '/manifest',
      processOutput(assets) {
        for (let key in assets) {
          assets[key + '.js'] = assets[key].js.slice(options.output.publicPath.length);
          delete assets[key];
        }
        return JSON.stringify(assets);
      }
    }));
  }

  return gulp.src('src/client/index.js')
    .pipe(plumber({
      errorHandler: notify.onError(err => ({
        title:   'Webpack',
        message: err.message
      }))
    }))
    .pipe(named())
    .pipe(webpackStream(options, null, done))
    // .pipe(gulpIf(!isDevelopment, uglify()))
    .pipe(gulp.dest('dist/public'))
    .on('data', function() {
      if (firstBuildReady) {
        callback();
      }
    });

});
gulp.task('webpack:server', function(callback) {
  let firstBuildReady = false;

  function done(err, stats) {
    firstBuildReady = true;

    if (err) { // hard error, see https://webpack.github.io/docs/node.js-api.html#error-handling
      return;  // emit('error', err) in webpack-stream
    }

    gulplog[stats.hasErrors() ? 'error' : 'info'](stats.toString({
      colors: true
    }));

  }

  let options = {
    output: {
      publicPath: '/',
      // filename: isDevelopment ? '[name].js' : '[name]-[chunkhash:10].js'
      filename: 'server.js'
    },
    watch:   isDevelopment,
    devtool: isDevelopment ? 'cheap-module-inline-source-map' : null,
    module:  {
      loaders: [{
        test:    /\.js$/,
        include: path.join(__dirname, "src"),
        loader:  'babel?presets[]=es2015'
      }]
    },
    plugins: [
      new webpack.NoErrorsPlugin()
    ]
  };

  if (!isDevelopment) {
    options.plugins.push(new AssetsPlugin({
      filename: 'webpack.json',
      path:     __dirname + '/manifest',
      processOutput(assets) {
        for (let key in assets) {
          assets[key + '.js'] = assets[key].js.slice(options.output.publicPath.length);
          delete assets[key];
        }
        return JSON.stringify(assets);
      }
    }));
  }

  return gulp.src('src/server/index.js')
    .pipe(plumber({
      errorHandler: notify.onError(err => ({
        title:   'Webpack',
        message: err.message
      }))
    }))
    .pipe(named())
    .pipe(webpackStream(options, null, done))
    // .pipe(gulpIf(!isDevelopment, uglify()))
    .pipe(gulp.dest('dist'))
    .on('data', function() {
      if (firstBuildReady) {
        callback();
      }
    });
});

// DEFAULT
gulp.task('default', [
  // 'js:client',
  // 'js:server',
  // 'clean',
  // 'webpack:client',
  'webpack:server',
  'nodemon'
  // 'assets',
  // 'browsersync'
]);
