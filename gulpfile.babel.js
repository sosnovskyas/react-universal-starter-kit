'use strict';

import gulp from "gulp";
import path from "path";
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
    server: 'dist/server'
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
  let options;
  let first = false;

  function done(err, stats) {
    // first = true;
    if (err) {
      return;
    }
    console.log('DONE', stats);
  }

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

  function done(err, stats) {
    if (err) {
      return;
    }
    console.log('DONE', stats);
  }
  
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

// DEFAULT
gulp.task('default', [
  'js:client',
  'js:server',
  'assets',
  'browsersync'
]);
