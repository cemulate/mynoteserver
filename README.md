# My Note Server

A simple, self-hosted note-taking solution with the following key features:

* Typed content comes _first_; full Markdown support
* **First-class support** for math with MathJax, including custom configurations and macros
* Notes are stored as _plain markdown files_ in a single directory with _one_ level of hierarchy: `collection/name`.
* Insert drawings/figures instantly with a button or `ctrl-space`
    * Rich sketch interface with full support for stylus pressure & erasers, colors, etc.
    * **No managing image files and links!** Images are stored _directly_ in the markdown document as an image tag with a data URL, conveniently hidden from view in the editor.
    * Edit images easily by re-opening the sketch area with your cursor on the line of an existing figure tag.

# Usage

Distribution is as an npm package, but nothing is published on npm yet.
For now, download `mynoteserver-x.x.x.tgz` from the Releases, and run

```
$ sudo npm -g install mynoteserver-x.x.x.tgz
$ mynoteserver -h [host] -p [port] -d [notes directory]
```

## Deployment

This is meant to be a self-hosted application.
Though the server implements basic security measures, it still accesses the filesystem and it is assumed that you "know what you're doing" when it comes to exposing the app to the internet. "Production" deployments should use standard solutions such as a reverse proxy, virtualization, proper user permissions, etc.

