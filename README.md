# My Note Server

Check out 

A **simple**, **self-hosted** note-taking and **slide-making** solution.

You can [see the demo](https://cemulate.github.io/mynoteserver/app/) for an overview of basic features. 
Note that this demo has no server-side capability, but only serves to demonstrate the editor on a sample buffer.

More detailed documentation is below.

# Reference

### Shortcuts

* Most universal markdown text-editing shortcuts should work, and things like `ctrl-s` for save.
* Double click split-view gutter: reset to default proportion
* `ctrl-space`: Add/edit/open image under cursor
* `ctrl-p`: File palette (switch, open, create new files)

### Customization

Customization can be done through certain files that will be loaded in place of their defaults, if present at the top level of the notes directory with the following names:
* `config.js`: Add MathJax macros ([per the MathJax docs](https://docs.mathjax.org/en/latest/input/tex/macros.html)), snippets (in the [style of vscode](https://code.visualstudio.com/docs/editor/userdefinedsnippets), but only [what codemirror supports](https://codemirror.net/docs/ref/#autocomplete.snippet)), and configure some settings for image drawing. This is done by adding data to a global `window.mynoteserver` object as done in the [default config file](/server/resources/config-default.js).
* `reveal-theme.css`: Use a reveal.js theme of your choosing; the default one is a combination of the default and dark theme (depending on dark mode)
* `highlight-theme.css`: Use a highlight.js theme of your choosing (for code highlighting), the default one again includes a light and dark theme.
* Macros can be automatically added to a custom `config.js` file from the editor by bringing up a dialog with `ctrl-alt-m`.

* The editor supports snippet completion, in the [style of vscode](https://code.visualstudio.com/docs/editor/userdefinedsnippets). By default, all builtin LaTeX commands as well as all user-defined MathJax macros have automatically created snippets. You can also use the `config.js` file to add additional snippets; the [default config file](/src/lib/config-default.js) has some included. The supported syntax is the same as as vscode snippet JSON files, but doesn't support all features such as variables and regex (only what [codemirror supports](https://codemirror.net/docs/ref/#autocomplete.snippet)).

# Architecture and implementation

This app glues together a vast number of robust and customizable existing technologies.
An overview:
* It is a Vue 3 application, with [Bulma](https://bulma.io/) for the basic UI; the server is [fastify](https://fastify.dev/).
* [Codemirror](https://codemirror.net/) provides the (extremely robust, extensible, and featureful!) editor.
* [markdown-it](https://github.com/markdown-it/markdown-it) and various extensions is used and customized for rendering.
* Math is implemented with [MathJax](https://www.mathjax.org/)
* [perfect-freehand](https://github.com/steveruizok/perfect-freehand) is used for sketching.
