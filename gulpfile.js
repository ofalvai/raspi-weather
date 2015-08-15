var gulp = require('gulp');
var livereload = require('gulp-livereload');
var nodemon = require('gulp-nodemon');
var del = require('del');
var gulpif = require('gulp-if');
var lazypipe = require('lazypipe');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
// var uncss = require('gulp-uncss');
var minifyCSS = require('gulp-minify-css');

gulp.task('default', function() {
    livereload.listen();
    gulp.watch('public/**').on('change', livereload.changed);

    nodemon({
        script: 'app.js',
        env: {'NODE_ENV': 'development'},
        ignore: ['public/*', 'public_dist/*', 'node_modules/*', 'gulpfile.js']
    });
});


// 'build' task below:

gulp.task('clean', function(cb) {
    del(['public_dist/'], cb);
});


gulp.task('main', function() {
    // This is the main task, this handles the templates, and the resources linked in them (CSS and JS).
    var assets = useref.assets();
    gulp.src('public/*.html')
        .pipe(assets)

        .pipe(gulpif('*.js', jsTasks()))
        .pipe(gulpif('*.css', cssTasks()))
        .pipe(assets.restore())
        .pipe(useref())

        .pipe(gulp.dest('public_dist/'))
});


var jsTasks = lazypipe()
    // An alternate pipe to be executed later in the "main" task on *.js files
    // Notice the methods have not been called yet! ("uglify" instead of "uglify()")
    .pipe(uglify)


var cssTasks = lazypipe()
    .pipe(minifyCSS)


gulp.task('images', function() {
    gulp.src('public/images/**/*')
        .pipe(gulp.dest('public_dist/images'));
});


gulp.task('other', function() {
    // This tasks copies misc. static files and directories

    gulp.src('public/fonts/*')
        .pipe(gulp.dest('public_dist/fonts'));
});

// UnCSS doesn't work, because of PhantomJS bugs on ARM,
// but here is a test CSS task
gulp.task('css', function() {
    return gulp.src('public/stylesheets/*.css')
        .pipe(uncss({
            html: ['public/index.html']
        }))
        .pipe(gulp.dest('public_dist/stylesheets'));
})

gulp.task('build', ['clean', 'main', 'images', 'other']);