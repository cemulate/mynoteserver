# My Note Server

A simple, self-hosted note-taking and slide-making solution with the following key features:

* Typed content comes _first_; full Markdown support
* **First-class support** for math with MathJax, including custom configurations and macros
    * Create a file called `config.js` in the top level of your notes directory and the app will include it.
    Among other things, you can use this file to configure MathJax and add macros.
    An [example of such a file](https://docs.mathjax.org/en/latest/input/tex/macros.html) is in the MathJax docs.
        * Press `ctrl-alt-m` add a new MathJax macro definition to the bottom of your `mathjax-config.js` file; a reload is required before it takes effect on the page.
* Notes are stored as _plain markdown files_ in a single directory with _one_ level of hierarchy: `collection/name`.
* Insert drawings/figures instantly with a button or `ctrl-space`
    * Or `ctrl-v` to insert (and sketch on) an image from the clipboard.
    * Rich sketch interface with full support for stylus pressure & erasers, colors, etc.
    * **No managing image files and links!** Images are stored _directly_ in the markdown document as an image tag with a data URL, conveniently hidden from view in the editor.
    * Edit images easily by re-opening the sketch area with your cursor on the line of an existing figure tag.
    * Including SVG images is supported by pasting a raw `<svg>` into the editor; as long as the svg code is on one line, such tags will be hidden in the editor like other images
        * Stripping white space to get just one line can be done by a tool like [SVGOMG](https://jakearchibald.github.io/svgomg/)
        * For best positioning results, avoid setting `width` and `height` attributes on your svg; instead use `viewBox` to ensure the image takes up its whole container ([SVGOMG](https://jakearchibald.github.io/svgomg/) can do this via the "Prefer viewBox to width/height" option).
        You can use [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs) to then set the width and position of the containing paragraph (see below for more about using this to position images in presentations).
* Instead of notes, **make [Reveal.js](https://revealjs.com) presentations** by starting the document with `---`. 
In this case, horizontal rules (`---`) are treated as slide boundaries.
    * In this mode, the fullscreen button will easily present the slides
    * Use the "Fragmented" button to *automatically* add the `fragment` class to all block elements, making your presentation **automatically proceed step-by-step**.
    * There is a default reveal.js theme, but you can drop a file called `reveal-theme.css` in the top level of your notes directory to use include that css, this can be an existing reveal.js theme or your own.
    * [markdown-it-attrs](https://github.com/arve0/markdown-it-attrs) is included so you can arbitrary alter attributes/classes on output HTML; this is particular useful for coloring text (for which some utility css classes are incldued) or for "floating" images in slides with `position: absolute`.
* While the app is served at `/app` (and the api at `/api`), there is also a "static" view of your notes under `/notes`
    * `/notes` itself serves a basic directory of notes by modification date.
    * `/notes/collection/file` will produce a static server-rendered view of the note, useful for reading on mobile or printing to PDF.
    * If the file is a presentation, the same url will render a standalone Reveal.js fullscreen presentation; use `fragmentify` in the query string to enable fragmented mode on the presentation. In particular, you can use this page to export the presentation to PDF [per the reveal.js docs](https://revealjs.com/pdf-export/)
* The editor supports snippet completion, in the [style of vscode](https://code.visualstudio.com/docs/editor/userdefinedsnippets). By default, all builtin LaTeX commands as well as all user-defined MathJax macros have automatically created snippets. You can also use the `config.js` file to add additional snippets; the [default config file](/src/lib/config-default.js) has some included. The supported syntax is the same as as vscode snippet JSON files, but doesn't support all features such as variables and regex (only what [codemirror supports](https://codemirror.net/docs/ref/#autocomplete.snippet)).

Check out [the demo](https://cemulate.github.io/mynoteserver/app/); this is a mocked-out copy of the front-end/app that you can use to test out the editor.

# Usage

Distribution is as an npm package, but nothing is published on npm yet.
For now, download `mynoteserver-x.x.x.tgz` from the Releases, and run

```
$ sudo npm -g install mynoteserver-x.x.x.tgz
$ mynoteserver -h [host] -p [port] -d [notes directory]
```

# Reference

* Key shortcuts
    * `ctrl-space`: Add/edit/open image under cursor
    * `ctrl-p`: File palette (switch, open, create new files)
    * `ctrl-s`: Save file
    * `ctrl-alt-m`: Add MathJax macro to `mathjax-config.js`
    * Double click split-view gutter: reset to default proportion
* Toolbar buttons
    * Folder/filename: Open file palette
    * Image button: Add/edit/open image under cursor
    * Link button: Contains a link to a static/server-rendered simple view of the current file; useful for bookmarking just to read or printing.
    * Fullscreen button: Make editor fullscreen or, if the document is a presentation, present it.

## Deployment

This is meant to be a self-hosted application; it does not implement any restrction functionality itself (password-protected accounts or permissions).
Though the server implements basic security measures, it still accesses the filesystem and it is assumed that you "know what you're doing" when it comes to exposing the app to the internet. "Production" deployments should use standard solutions such as a reverse proxy, virtualization, proper user permissions, etc.

