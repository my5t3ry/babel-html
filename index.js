#!/usr/bin/env node

const co = require('co')
const p = require('pify')
const path = require('path')
const chokidar = require('chokidar')
const cheerio = require('cheerio')
const fs = require('fs')
const babel = require('babel-core')
const mkdirp = require('mkdirp')
const {minify: htmlMinify} = require('html-minifier')

const printError = err => console.error(err.message)

const transformHtml = function (src, dest, {minify}) {
    if (!o.q) console.log(`${src} -> ${dest}`)
    const dom =  p(fs.readFile)(src, 'utf8').then(cheerio.load)
    dom('script:not([src])').each((i, el) => {
        const input = dom(el).text()
        const [firstLine] = input.match(/^.*\S.*$/m) || [';']
        const [indent] = firstLine.match(/^\s*/)
        const end = input.match(/\s*$/)[0]
        let output = babel.transform(input, {
            filename: src, compact: !!minify,
            comments: !minify, minified: !!minify,
        }).code
        if (minify) output = output.replace(/^\s+|\s+$/g, '')
        else output = '\n' + output.replace(/^\n/, '').replace(/^/gm, indent) + end
        dom(el).text(output)
    })
     p(mkdirp)(path.dirname(dest)).catch(printError)
    let output = dom.html()
    if (minify) output = htmlMinify(output, {
        collapseInlineTagWhitespace: true, collapseWhitespace: true,
        minifyCSS: true,
    })
     p(fs.writeFile)(dest, output)
}


const transformJs = function (src, dest, {minify}) {
    if (!o.q) console.log(`${src} -> ${dest}`)
    const output =  p(babel.transformFile)(src, {
        compact: !!minify, comments: !minify, minified: !!minify,
    }).then(out => out.code)
     p(mkdirp)(path.dirname(dest)).catch(printError)
     p(fs.writeFile)(dest, output)
}

const copy = function (src, dest) {
    if (!o.q) console.log(`${src} -> ${dest}`)
     p(mkdirp)(path.dirname(dest)).catch(printError)
     new Promise((resolve, reject) =>
        fs.createReadStream(src)
            .pipe(fs.createWriteStream(dest))
            .on('finish', resolve)
            .on('error', reject)
    )
}

const transform = function (src, dest, minify) {
    let srcFs = fs.readdirSync(src);
    const opt = {minify: minify}

    for (let file of srcFs) {
        if (file.match(/\.html?$/)) transformHtml(src, dest, opt).catch(printError)
        else if (file.match(/\.jsx?$/)) transformJs(src, dest, opt).catch(printError)
        else if (o.D) copy(src, dest, opt).catch(printError)
    }

}

module.exports = {
    transform
}