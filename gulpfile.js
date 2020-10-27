var {task, src, dest, parallel, series, watch} = require('gulp');
var sass = require('gulp-sass');
sass.compiler = require('dart-sass');
var postcss = require('gulp-postcss');
var postcssPresetEnv = require('postcss-preset-env');
var cached = require('gulp-cached');
var plumber = require('gulp-plumber');
var webpack = require('webpack-stream');
var rename = require('gulp-rename');
var imageMin = require('gulp-imagemin');
var changed = require('gulp-changed');
var browser = require('browser-sync').create();

const MODE = process.env.NODE_ENV || 'development';
var isProduction = () => MODE === 'production';

task('style', () => {
  return src('./assets/scss/index.scss', {sourcemaps:true})
    .pipe(plumber())
    .pipe(cached('style'))
    .pipe(sass.sync())
    .pipe(postcss([
      postcssPresetEnv({
        autoprefixer: true,
      })
    ]))
    .pipe(rename({
      basename: 'main',
    }))
    .pipe(dest('./assets/css', {sourcemaps:'.'}))
    .pipe(browser.stream({
      match: [
        '**/*.css',
        '**/*.map.css',
      ]
    }))
});

task('script', () => {
  return src('./assets/js/index.js')
    .pipe(plumber())
    .pipe(webpack({
      mode: MODE,
      cache: true,
      devtool: 'source-map',
      module: {
        rules: [
          {
            test: /.js$/,
            loader: 'babel-loader',
            options: {
              "presets": ["@babel/preset-env"],
            }
          },
        ]
      },
      watchOptions: {
        ignored: [
          'node_modules/**',
        ],
      },
      output: {
        filename: 'main.js',
      },
      optimization: {
        minimize: isProduction()
      },
    }))
    .pipe(dest('./assets/js'))
});

task('images', done => {
  src('./assets/img/@raws/**')
    .pipe(changed('./assets/img'))
    .pipe(imageMin([
      imageMin.mozjpeg({
        quality: 82,
        progressive: true,
      })
    ]))
    .pipe(dest('./assets/img'));

  src('./images/@raws/**')
    .pipe(changed('./images'))
    .pipe(imageMin([
      imageMin.mozjpeg({
        quality: 82,
        progressive: true,
      })
    ]))
    .pipe(dest('./images'));

  done();
});

var reload = done => {
  browser.reload();
  done();
}

task('server', () => {
  return browser.init({
    open: false,
    server: true,
    middleware: function (req, res, next) {
      res.setHeader('Expires', '0');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      next();
    },
  });
});

task('watch', () => {
  watch([
    './assets/scss/**/*.scss',
  ], parallel('style'));

  watch([
    './assets/js/**/*.js',
  ], series('script', reload));

  watch([
    './assets/img/@raws/**',
    './images/@raws/**',
  ], series('images'))

  watch([
    '!node_modules/**',
    '**/*.html',
  ], series(reload));
});

task('build', parallel('style', 'script', 'images'));
task('serve', series('build', parallel('watch', 'server')));
task('default', parallel('serve'));