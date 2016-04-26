'use strict';

import gulp from 'gulp';
import glob from 'glob';
import del from 'del';
import ws from 'ws';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import runSequence from 'run-sequence';
import gulpLoadPlugins from 'gulp-load-plugins';

const $ = gulpLoadPlugins();

gulp.task('clean', () => del(['dist/*'], { dot: true }));

gulp.task('manifest', () => {
  return gulp.src('app/manifest.json')
    .pipe(gulp.dest('dist'))
    .pipe($.size({ title: 'manifest' }))
});

gulp.task('locales', () => {
  return gulp.src('app/_locales/**/*')
    .pipe(gulp.dest('dist/_locales'))
    .pipe($.size({ title: 'locales' }))
});

gulp.task('html', () => {
  return gulp.src('app/**/*.html')
    .pipe(gulp.dest('dist'))
    .pipe($.size({ title: 'html' }));
});

gulp.task('fonts', () => {
  return gulp.src('app/fonts/**/*')
    .pipe(gulp.dest('dist/fonts'))
    .pipe($.size({ title: 'fonts' }));
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe(gulp.dest('dist/images'))
    .pipe($.size({ title: 'images' }));
});

gulp.task('lint', () => {
  return gulp.src(['app/scripts/**/*.js', 'test/**/*.js'])
    .pipe($.eslint())
    .pipe($.eslint.format());
});

gulp.task('scripts', () => {
  var files = glob.sync('!(lib)', { cwd: 'app/scripts' });
  files.forEach((file) => {
    return browserify('app/scripts/' + file)
      .transform('babelify', { presets: ['es2015'] })
      .bundle().on('error', $.util.log)
      .pipe(source(file))
      .pipe(gulp.dest('dist/scripts'))
      .pipe($.size({ title: 'scripts' }));
  });
});

gulp.task('styles', () => {
  return gulp.src('app/styles/!(lib)')
    .pipe($.sass({ includePaths: 'node_modules' }).on('error', $.sass.logError))
    .pipe(gulp.dest('dist/styles'))
    .pipe($.size({ title: 'styles' }));
});

gulp.task('test', () => {
  return gulp.src('test/**/*test.js', { read: false })
    .pipe($.mocha());
});

gulp.task('watch', () => {
  var server = new ws.Server({ port: 8080 });

  var connection;
  server.on('connection', (ws) => {
    connection = ws;
  });

  function reload() {
    $.util.log('-- reload');
    if (connection) {
      connection.send('reload-extension', $.util.log);
    }
  }

  gulp.watch('app/manifest.json', ['manifest', reload]);
  gulp.watch('app/_locales/**/*', ['locales', reload]);
  gulp.watch('app/**/*.html', ['html', reload]);
  gulp.watch('app/images/**/*', ['images', reload]);
  gulp.watch('app/scripts/**/*', ['scripts', reload]);
  gulp.watch('app/styles/**/*', ['styles', reload]);
});

gulp.task('build', ['clean'], (cb) => {
  runSequence(['manifest', 'locales', 'html', 'images', 'fonts', 'scripts', 'styles'], cb);
});

gulp.task('dev', ['build', 'lint'], (cb) => {
  runSequence(['test', 'watch'], cb);
  gulp.watch('test/**/*test.js', (file) => {
    gulp.run('lint');
    return gulp.src(file.path).pipe($.mocha());
  });
  gulp.watch('app/scripts/**/*', ['lint', 'test']);
});

gulp.task('default', ['build']);
