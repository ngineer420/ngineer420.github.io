#!/usr/bin/env python3
"""Add the og:image tags to the <head> of hand-written pages.

Usage:
    python3 add_tags.py https://example.com page.html [page2.html ...]
    python3 add_tags.py --check https://example.com page.html [...]

For each page the script makes sure that the head has:

    <meta property="og:image" content="https://example.com/assets/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">

The script keeps the tags that exist. It adds the missing ones after the
og:image line, or after the og:url line, or after the canonical link, or after
the description. It copies the indentation of that line. It changes
twitter:card from "summary" to "summary_large_image". Run it twice and the
second run changes nothing.

Do not run it on generated pages. Add the tags to the generator instead.

With --check the script exits 1 and names every page that it would change.
"""

import re
import sys

W = "1200"
H = "630"


def find_line(lines, pattern):
    rx = re.compile(pattern, re.I)
    for i, line in enumerate(lines):
        if rx.search(line):
            return i
    return -1


def indent_of(line):
    return line[: len(line) - len(line.lstrip())]


def add_tags(html, site):
    image = f"{site}/assets/og-image.png"
    lines = html.split("\n")

    # 1. og:image
    i = find_line(lines, r'<meta\s+property="og:image"')
    if i < 0:
        anchor = find_line(lines, r'<meta\s+property="og:url"')
        if anchor < 0:
            anchor = find_line(lines, r'<link\s+rel="canonical"')
        if anchor < 0:
            anchor = find_line(lines, r'<meta\s+name="description"')
        if anchor < 0:
            raise ValueError("no og:url, canonical link, or description to anchor on")
        pad = indent_of(lines[anchor])
        lines.insert(anchor + 1, f'{pad}<meta property="og:image" content="{image}">')
        i = anchor + 1
    pad = indent_of(lines[i])

    # 2. og:image:width and og:image:height, right after og:image
    if find_line(lines, r'<meta\s+property="og:image:width"') < 0:
        lines.insert(i + 1, f'{pad}<meta property="og:image:width" content="{W}">')
    if find_line(lines, r'<meta\s+property="og:image:height"') < 0:
        w = find_line(lines, r'<meta\s+property="og:image:width"')
        lines.insert(w + 1, f'{pad}<meta property="og:image:height" content="{H}">')

    # 3. twitter:card
    t = find_line(lines, r'<meta\s+name="twitter:card"')
    if t < 0:
        h = find_line(lines, r'<meta\s+property="og:image:height"')
        lines.insert(h + 1, f'{pad}<meta name="twitter:card" content="summary_large_image">')
    else:
        lines[t] = re.sub(r'content="summary"', 'content="summary_large_image"', lines[t])

    return "\n".join(lines)


def main(argv):
    check = "--check" in argv
    argv = [a for a in argv if a != "--check"]
    if len(argv) < 2:
        sys.exit(__doc__)
    site = argv[0].rstrip("/")
    stale = []
    for path in argv[1:]:
        with open(path, encoding="utf-8") as f:
            before = f.read()
        after = add_tags(before, site)
        if after == before:
            continue
        stale.append(path)
        if not check:
            with open(path, "w", encoding="utf-8") as f:
                f.write(after)
            print(f"updated {path}")
    if check and stale:
        print("stale: " + " ".join(stale))
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
