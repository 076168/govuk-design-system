const commonjs = require('rollup-plugin-commonjs') // rollup plugin to convert CommonJS modules to ES2015
const metalsmith = require('metalsmith') // static site generator
const path = require('path')
const resolve = require('rollup-plugin-node-resolve') // rollup plugin to resolve node_modules
const slugger = require('slugger') // generate slugs from titles

// Third party metalsmith plugins
const brokenLinkChecker = require('metalsmith-broken-link-checker')
const canonical = require('metalsmith-canonical') // add a canonical url property to pages
const env = require('metalsmith-env') // environment vars plugin
const hashAssets = require('metalsmith-fingerprint-ignore') // add hash to specified files and ignores files that match a pattern
const include = require('metalsmith-include-files') // include static assets
const inplace = require('@metalsmith/in-place') // render templating syntax in your source files
const layouts = require('@metalsmith/layouts') // apply layouts to source files
const permalinks = require('@metalsmith/permalinks') // apply a permalink pattern to files
const postcss = require('@metalsmith/postcss')
const renamer = require('metalsmith-renamer') // rename files
const sass = require('@metalsmith/sass') // convert Sass files to CSS using Dart Sass

// Local metalsmith plugins
const extractPageHeadings = require('../lib/extract-page-headings/index.js') // extract page headings into file meta data
const generateSitemap = require('./generate-sitemap.js') // generate sitemap
const lunr = require('./metalsmith-lunr-index') // generate search index
const modernizrBuild = require('./modernizr-build.js') // modernizr build plugin
const navigation = require('./navigation.js') // navigation plugin
const rollup = require('./rollup') // used to build GOV.UK Frontend JavaScript
const titleChecker = require('./metalsmith-title-checker.js')

// Helpers
const colours = require('../lib/colours.js') // get colours data
const fileHelper = require('../lib/file-helper.js') // helper function to operate on files
const highlighter = require('./highlighter.js')
const DesignSystemRenderer = require('./marked-renderer.js')
const paths = require('./paths.js') // specify paths to main working directories
const getMacroOptions = require('./get-macro-options/index.js')

// store views paths for rendering nunjucks syntax
const views = [
  paths.layouts,
  paths.partials,
  paths.components,
  paths.govukfrontend
]

// static site generator
module.exports = metalsmith(path.resolve(__dirname, '../'))

  // source directory
  .source(paths.source)

  // destination directory
  .destination(paths.public)

  // clean destination before build
  .clean(true)

  // global variables used in layout files
  .metadata({
    title: '[TITLE NOT SET]',
    colours
  })

  // rename .md files to .md.njk, so they're passed through the Nunjucks parser
  .use(renamer({
    markdown: {
      pattern: '**/*.md',
      rename: (name) => {
        return `${name}.njk`
      }
    }
  }))

// extract page headings
  .use(extractPageHeadings())

  // Ignore internal config
  .ignore('.eslintrc.js')

  // include environment variables as metalsmith metadata
  // used to e.g. detect when we're building in a preview environment
  .use(env())

  // convert *.scss files to *.css
  .use(sass({
    quietDeps: true,
    loadPaths: ['node_modules', 'src/stylesheets'] // an array of paths that sass can look in when attempt to resolve @import declarations
  }))

  .use(postcss({
    plugins: {
      autoprefixer: {}
    }
  }))

  .use(include({
    directories: {
      assets: [
        path.join('**/', paths.govukfrontend, 'govuk/assets/*')
      ],
      'assets/fonts': [
        path.join('**/', paths.govukfrontend, 'govuk/assets/fonts/*')
      ],
      'assets/images': [
        path.join('**/', paths.govukfrontend, 'govuk/assets/images/*')
      ],
      'javascripts/vendor': [
        path.join('**/', paths.iframeresizer, 'js/*')
      ]
    }
  }))

  // build custom modernizr.js file
  .use(modernizrBuild({
    config: path.normalize('../config/modernizr.json'),
    destination: path.normalize('javascripts/vendor/'),
    filename: 'modernizr.js'
  }))

  // build the entrypoint for the IE8 JavaScript that goes in the <head>
  .use(rollup({
    input: 'javascripts/head-ie8.js',
    output: {
      legacy: true,
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }))

  // build the entrypoint for application specific JavaScript
  .use(rollup({
    input: 'javascripts/application.js',
    output: {
      legacy: true,
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }))

  // build the entrypoint for application IE8 specific JavaScript
  .use(rollup({
    input: 'javascripts/application-ie8.js',
    output: {
      legacy: true,
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }))

  // build GOV.UK Frontend JavaScript
  .use(rollup({
    input: 'javascripts/govuk-frontend.js',
    output: {
      legacy: true,
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }))

  // build the entrypoint for example specific JavaScript
  .use(rollup({
    input: 'javascripts/example.js',
    output: {
      legacy: true,
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  }))

  // add hash to files
  .use(hashAssets({
    pattern: [
      '**\\*.css',
      '**/*.css',
      path.normalize('javascripts/application-ie8.js'),
      path.normalize('javascripts/application.js'),
      path.normalize('javascripts/head-ie8.js'),
      path.normalize('javascripts/govuk-frontend.js'),
      path.normalize('javascripts/example.js'),
      path.normalize('javascripts/vendor/modernizr.js')
    ]
  }))

  // check titles are set
  .use(titleChecker())

  // render templating syntax in source files
  .use(inplace({
    pattern: '**/*.njk',
    engineOptions: {
      // Nunjucks engine options
      path: views,
      noCache: true, // never use a cache and recompile templates each time
      trimBlocks: true, // automatically remove trailing newlines
      lstripBlocks: true, // automatically remove leading whitespace
      globals: {
        getFrontmatter: fileHelper.getFrontmatter,
        getNunjucksCode: fileHelper.getNunjucksCode,
        getHTMLCode: fileHelper.getHTMLCode,
        getFingerprint: fileHelper.getFingerprint,
        getMacroOptions
      },
      filters: {
        highlight: highlighter,
        slugger,
        kebabCase: (string) => {
          return string.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
        }
      },

      // Markdown engine options
      mangle: false, // Don't mangle emails
      renderer: new DesignSystemRenderer(),
      smartypants: true, // use "smart" typographic punctuation
      highlight: highlighter
    }
  }))

  // apply a permalink pattern to files
  .use(permalinks({
    relative: false
  }))

  // add a canonical url property to pages
  .use(canonical({
    hostname: 'https://design-system.service.gov.uk',
    omitIndex: true,
    omitTrailingSlashes: false
  }))

  // apply navigation
  .use(navigation())

  // generate a search index
  .use(lunr())

  // add hash to search index
  // we can't add it earlier with the rest
  // as we can only generate it just above
  .use(hashAssets({
    pattern: [
      'search-index.json'
    ]
  }))

  // apply layouts to source files
  .use(layouts({
    default: 'layout.njk',
    directory: paths.layouts,
    pattern: '**/*.html',
    engineOptions: {
      path: views,
      globals: {
        getFingerprint: fileHelper.getFingerprint
      }
    }
  }))

  // generate a sitemap.xml in public/ folder
  .use(generateSitemap({
    hostname: 'https://design-system.service.gov.uk',
    pattern: ['**/*.html', '!**/default/*.html']
  }))

  // check broken links
  .use(brokenLinkChecker())

// Debug
// .use(debug())
