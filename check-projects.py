#!/usr/bin/env python3
"""Assert the three places a project has to be listed actually agree.

A project exists in three independent lists, and nothing until now checked that
they matched:

  1. public/bin/cat/projects/<name>.txt/     the terminal's `cat` page
  2. public/bin/ls/projects/                 the terminal's `ls` output
  3. projects/index.html                     the crawlable page Google reads

They drifted: eight projects had their terminal files and were missing from the
crawlable page, which is the one that exists for search engines. A commit titled
"Add missing tool sites to /projects" fixed 1 and 2 and left 3 alone, so the
titles agreed and the content did not.

Run: python3 check-projects.py
Exits non-zero, naming the gap, if any list disagrees.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent

# A project's directory name is not always its domain, so the crawlable page is
# matched on the domain it links to. Anything whose slug is not simply the
# domain's second-level label goes here.
SLUG_TO_DOMAIN = {
    "erabbit": "erabb.it",
    "calculatoreuphoria": "calculatoreuphoria.com",
    "clocklab": "clocklab.net",
    "drawlots": "drawlots.net",
    "hueshift": "hueshift.net",
    "notepadly": "notepadly.app",
    "perfecttune": "perfecttune.net",
    "photoshrink": "photoshrink.net",
    "qrmint": "qrmint.net",
    "textkitpro": "textkitpro.com",
}


def cat_projects():
    d = ROOT / "public" / "bin" / "cat" / "projects"
    return {p.name[: -len(".txt")] for p in d.iterdir() if p.name.endswith(".txt")}


def sudo_cat_projects():
    d = ROOT / "public" / "bin" / "cat" / "sudo" / "projects"
    return {p.name[: -len(".txt")] for p in d.iterdir() if p.name.endswith(".txt")}


def ls_projects():
    f = ROOT / "public" / "bin" / "ls" / "projects" / "index.turbo_frame.html"
    return set(re.findall(r"<li>([^<]+)\.txt</li>", f.read_text()))


def page_domains():
    f = ROOT / "projects" / "index.html"
    return set(re.findall(r'<li><a href="https://([^"/]+)"', f.read_text()))


def domain_for(slug):
    if slug in SLUG_TO_DOMAIN:
        return SLUG_TO_DOMAIN[slug]
    return slug + ".com"


def main():
    cat = cat_projects()
    problems = []

    missing_sudo = cat - sudo_cat_projects()
    if missing_sudo:
        problems.append("no sudo cat page: " + ", ".join(sorted(missing_sudo)))

    stray_sudo = sudo_cat_projects() - cat
    if stray_sudo:
        problems.append("sudo cat page with no real page: " + ", ".join(sorted(stray_sudo)))

    missing_ls = cat - ls_projects()
    if missing_ls:
        problems.append("not in `ls projects`: " + ", ".join(sorted(missing_ls)))

    stray_ls = ls_projects() - cat
    if stray_ls:
        problems.append("listed by `ls` but has no page: " + ", ".join(sorted(stray_ls)))

    domains = page_domains()
    missing_page = {s for s in cat if domain_for(s) not in domains}
    if missing_page:
        problems.append(
            "has a terminal page but is missing from projects/index.html: "
            + ", ".join(sorted(missing_page))
        )

    if problems:
        print("Project lists disagree:\n", file=sys.stderr)
        for p in problems:
            print("  - " + p, file=sys.stderr)
        print(
            "\nEvery project needs all three: a cat page (and its sudo mirror), an entry\n"
            "in `ls projects`, and a linked entry on projects/index.html.",
            file=sys.stderr,
        )
        return 1

    print("%d projects, all three lists agree." % len(cat))
    return 0


if __name__ == "__main__":
    sys.exit(main())
