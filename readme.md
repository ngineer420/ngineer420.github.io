# Development

Where: 
- `<NAV-CMD>` is `cd`, `cd/sudo`, `ls`, `ls/sudo`, `pwd` or `pwd/sudo` 
- `<FILE-CMD>` is `cat` or `cat/sudo`

## Add a "folder"

- public/bin/`<NAV-CMD>`/`<FOLDER-PATH>`/index.turbo_frame.html

```bash
DIR_PATH=foo/bar ruby mkdir.rb
```

## Add a "file"

- public/bin/`<FILE-CMD>`/`<FILE-PATH>`/index.turbo_frame.html

```bash
FILE_PATH=foo/bar/baz.txt ruby touch.rb
```