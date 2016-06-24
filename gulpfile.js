var gulp = require('gulp');
var browserSync = require('browser-sync').create(); //live sync in many browsers
var autoprefixer = require('gulp-autoprefixer');
var useref = require('gulp-useref'); // concatenate files
var cssnano = require('gulp-cssnano'); // minify css files
var uglify = require('gulp-uglify'); // minify js files
var gulpIf = require('gulp-if'); // conditionals
var htmlmin = require('gulp-htmlmin'); // minify html files
var del = require('del'); // delete folders
var runSequence = require('run-sequence'); // run task in sequences
var debug = require('gulp-debug'); 
var cache = require('gulp-appcache');
var ghPages = require('gulp-gh-pages'); // publish contents in ghpages
var critical = require('critical');

/* 
	Tasks for dev 
*/

gulp.task('autoprefixer',function(){
	return gulp.src('app/static/css/*.css')
		//.pipe(debug())
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(gulp.dest('app/static/css/'))
		.pipe(browserSync.reload({
			stream: true
		}))
});

gulp.task('browserSync',function(){
	browserSync.init({
		startPath:'./app',
		server:{
			baseDir: './',
			https: true
		}
	})
});

gulp.task('watch',['browserSync'],function(){
	gulp.watch('app/static/css/**/*.css',['autoprefixer']);
	gulp.watch('app/index.html',browserSync.reload);
	gulp.watch('app/static/js/**/*.js',browserSync.reload);
});


/* 
	Tasks for build 
*/

/*  Minifies html, concat and minifies css and js files*/
gulp.task('build_html',function(){
	return gulp.src('app/index.html')
		//.pipe(debug())
        .pipe(useref())
        
        .pipe(gulpIf('**/main.min.js', uglify({
			mangle: true,compress: {
				sequences: true,// join consecutive statements using comma
				dead_code: true,// remove unreachable code
				conditionals: true, // apply otimizations for ifs and conditionals
				booleans: true, // optimizations for boolean
				unused: true, // drop unreferenced variables and functions
				warnings: true, // display warnings when dropping unreachable code or unused variables
				if_return: true, // optimizations for if/return, if/continue
				join_vars: true, // join consecutive var statements
				properties: true, // rewrite property access using dot notation (foo['bar'] -> foo.bar)
				drop_console:true // remove console.log	
			}
		})))
		.pipe(gulpIf('**/detection.min.js', uglify({
					mangle: true,compress: {
						sequences: true,// join consecutive statements using comma
						dead_code: true,// remove unreachable code
						conditionals: true, // apply otimizations for ifs and conditionals
						booleans: true, // optimizations for boolean
						unused: true, // drop unreferenced variables and functions
						warnings: true, // display warnings when dropping unreachable code or unused variables
						if_return: true, // optimizations for if/return, if/continue
						join_vars: true, // join consecutive var statements
						properties: true, // rewrite property access using dot notation (foo['bar'] -> foo.bar)
					}
				})))

        .pipe(gulpIf('*.css', cssnano()))

        .pipe(gulpIf('*.html',htmlmin({
			collapseWhitespace: true,
			removeComments:true
		})))
		
        .pipe(gulp.dest('dist'));
});

/* Copy assets to dist */
gulp.task('build_favicons', function(){
	return gulp.src('app/favicons/**/*.*')
		.pipe(gulp.dest('dist/favicons'));
});

gulp.task('build_fonts', function(){
	return gulp.src('app/static/fonts/**/Roboto-Regular.*')
		//.pipe(debug())
		.pipe(gulp.dest('dist/static/fonts'));
});

gulp.task('build_icons', function(){
	return gulp.src('app/static/icons/*.*')
		.pipe(gulp.dest('dist/static/icons'));
});

gulp.task('build_jsons', function(){
	return gulp.src('app/static/json/*.json')
		.pipe(gulp.dest('dist/static/json'));
});

gulp.task('cache',function(){
	return gulp.src(['dist/**/*',])
		.pipe(cache({
			filename: 'cache.appcache',
			exclude: 'cache.appcache',
			preferOnline: false,
			hash: true,
		}))
		//.pipe(debug())
		.pipe(gulp.dest('dist/'));
});

/* Delete dist folder */
gulp.task('clean:dist',function(){
	return del.sync('dist')
});

gulp.task('deploy',['build'],function(){
	return gulp.src('./dist/**/*')
		//.pipe(debug())
		.pipe(ghPages());
});

gulp.task('critical', function () {
	critical.generate({
        inline: true,
        base: 'dist/',
        src: 'index.html',
        dest: 'dist/index.html',
        minify: true,
        width: 320,
        height: 480
    });
});

/* 
	Main tasks 
*/

gulp.task('default',function(callback){
	runSequence(['autoprefixer','browserSync','watch'],callback)
});

/*  cache task is called before build_favicons task, to not include 
	the favicons folder in manifest file
*/
gulp.task('build', function (callback) {
  runSequence('clean:dist', 
    'autoprefixer','build_html',
    ['build_fonts','build_icons','build_jsons'],
    'cache','build_favicons','critical',
    callback
  )
})