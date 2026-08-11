import { Controller } from "@hotwired/stimulus"

type DirectoryEntry = {
  name: string
  directory: boolean
}

export default class InputController extends Controller<HTMLElement> {
  static inferredPathCmds = [ "/bin/ls", "/bin/pwd" ]
  // `cd` and `ls` only ever address a directory - there is no `ls biography.txt`
  // page - so they are the commands whose completions leave files out.
  static dirOnlyCmds = [ "cd", "ls" ]
  static sudoCmd = "sudo"
  static targets = [ "cwd" ]
  static values = {
    history: Array,
    historyIndex: Number
  }

  declare readonly cwdTarget: HTMLAnchorElement
  declare readonly cwdTargets: HTMLAnchorElement[]
  declare readonly hasCwdTarget: boolean
  declare readonly hasHistoryIndexValue: boolean
  declare readonly hasHistoryValue: boolean
  declare historyIndexValue: number
  declare historyValue: Array<string>

  // What `ls` prints is the only description this site has of what a directory
  // holds, so completion reads that rather than keeping a list of its own. A
  // listing cannot change while the page is open, so each one is fetched once.
  private listings: Map<string, Promise<DirectoryEntry[]>> = new Map()
  // The command line as it stood after the last tab, so that a second tab on
  // unchanged input can print the candidates instead of doing nothing twice.
  private lastTabbedVal: string | null = null

  clear(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()

    ev.target.innerHTML = ""
  }

  async complete(ev: KeyboardEvent & { target: HTMLElement }) {
    // Synchronous, and before any await: otherwise the browser has already
    // moved focus off the command line by the time a listing arrives.
    ev.preventDefault()

    let input = ev.target
    let val = input.textContent || ""
    let caret = this.caretOffset(input)
    let start = this.wordStart(val, caret)
    let word = val.slice(start, caret)
    let slash = word.lastIndexOf("/")
    let dir = word.slice(0, slash + 1)
    let base = word.slice(slash + 1)

    let tabbedTwice = this.lastTabbedVal == val
    this.lastTabbedVal = null

    let candidates = await this.candidates(val.slice(0, start), dir, base)
    let matches = candidates.filter((entry) => entry.name.startsWith(base))

    // The listing was fetched over the network; the user may have typed on.
    if (input.textContent != val) return
    // Nothing matches, so nothing happens - no error, no lost input.
    if (matches.length == 0) return

    let only = matches[0]

    if (matches.length == 1 && only) {
      this.insert(input, val, start, caret,
                  `${dir}${only.name}${only.directory ? "/" : " "}`)

      return
    }

    let shared = this.commonPrefix(matches.map((entry) => entry.name))

    if (shared.length > base.length) {
      val = this.insert(input, val, start, caret, `${dir}${shared}`)
    }
    else if (tabbedTwice) {
      this.listCandidates(val, matches)
    }

    this.lastTabbedVal = val
  }

  enterCmd(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()

    let cmdVal = ev.target.innerText.trimRight()

    this.appendHistory(cmdVal)

    if (cmdVal == "clear") {
      this.dispatch("clearOut")
    }
    else {
      let output = `${this.cwdTarget.text} ${cmdVal}`

      this.dispatch("stdOut", { detail: { htmlStr: output } })
      this.goTo(cmdVal)
    }

    ev.target.innerHTML = ""
  }

  showNextCmd(ev: Event & { target: HTMLElement }) {
    if (this.historyIndexValue > 0) {
      this.historyIndexValue--
    }

    this.showHistory(ev)
  }

  showPreviousCmd(ev: Event & { target: HTMLElement }) {
    if (this.historyIndexValue < this.historyValue.length) {
      this.historyIndexValue++
    }

    this.showHistory(ev)
  }

  private appendHistory(val: string) {
    let historyVal = this.historyValue
    historyVal.unshift(val)

    this.historyIndexValue = 0
    this.historyValue = historyVal
  }

  private async candidates(before: string, dir: string, base: string) {
    let words = before.split(/\s+/).filter((word) => word.length > 0)
    let sudo = words[0] == InputController.sudoCmd
    let argIndex = sudo ? words.length - 1 : words.length

    // A first word with no slash in it names a command, exactly as in a shell.
    // /bin is where the commands live, so /bin is what gets listed - the same
    // listing `ls bin` prints. `sudo` is the one word the parser knows itself.
    if (argIndex == 0 && dir == "") {
      let sudoEntry: DirectoryEntry = { name: InputController.sudoCmd, directory: false }

      return [ sudoEntry ].concat(await this.listDir("/bin/"))
    }

    let cmd = (sudo ? words[1] : words[0]) || ""
    let dirsOnly = InputController.dirOnlyCmds.includes(cmd.split("/").pop() || "")
    // `.` and `..` are entries of every directory, and like a shell they are
    // only offered once the user has committed to a leading dot.
    let dots: DirectoryEntry[] = base.startsWith(".")
      ? [ { name: ".", directory: true }, { name: "..", directory: true } ]
      : []

    let entries = dots.concat(await this.listDir(this.resolveDir(dir)))

    return dirsOnly ? entries.filter((entry) => entry.directory) : entries
  }

  private caretOffset(input: HTMLElement) {
    let val = input.textContent || ""
    let selection = window.getSelection()
    let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

    if (!range || !input.contains(range.endContainer)) return val.length

    let upToCaret = range.cloneRange()
    upToCaret.selectNodeContents(input)
    upToCaret.setEnd(range.endContainer, range.endOffset)

    return upToCaret.toString().length
  }

  private cmdPath(val: string) {
    let args = val.split(" ")
    let cmdArgs = args.splice(0, 1)

    if (cmdArgs[0] == "sudo") {
      cmdArgs.push(args.shift() || "")
      cmdArgs.reverse()
    }

    if (!cmdArgs[0]?.startsWith("/")) {
      cmdArgs[0] = cmdArgs[0]?.includes("/") 
                ? this.pathFromCwd(cmdArgs[0]) 
                : `/bin/${cmdArgs[0]}`
    }

    let inferPath = InputController.inferredPathCmds.includes(cmdArgs[0] || "")
    
    let dirPath = args.length > 0 || inferPath
                  ? this.pathFromCwd(args.join("/"))
                  : "/"

    return `${cmdArgs.join("/")}${dirPath}`
  }

  private commonPrefix(names: string[]) {
    return names.reduce((shared, name) => {
      let end = 0

      while (end < shared.length && shared[end] == name[end]) end++

      return shared.slice(0, end)
    })
  }

  private escape(val: string) {
    let holder = document.createElement("div")
    holder.textContent = val

    return holder.innerHTML
  }

  private goTo(cmdVal: string) {
    let path = this.cmdPath(cmdVal)
    path += path.endsWith("/") ? "" : "/"

    this.cwdTarget.href = new URL(window.location.href).origin
                          + `${path}index.turbo_frame.html`

    this.cwdTarget.dataset.turboFrame = path.startsWith("/bin/cd/")
                                        ? "input" 
                                        : "output"

    this.cwdTarget.click()
  }

  private insert(input: HTMLElement, val: string, start: number, caret: number,
                 word: string) {
    let completed = `${val.slice(0, start)}${word}${val.slice(caret)}`

    input.textContent = completed
    this.moveCaret(input, start + word.length)

    return completed
  }

  // A shell echoes the line you were typing, prints the candidates beneath it
  // and redraws the prompt. The command line is its own frame below the output
  // here, so echoing the line and appending the list produces exactly that.
  private listCandidates(val: string, matches: DirectoryEntry[]) {
    let names = matches.map((entry) =>
      `<li>${this.escape(entry.name)}${entry.directory ? "/" : ""}</li>`)

    let output = `${this.cwdTarget.text} ${this.escape(val)}`
                 + `<ul class="files">${names.join("")}</ul>`

    this.dispatch("stdOut", { detail: { htmlStr: output } })
  }

  private listDir(path: string) {
    let listing = this.listings.get(path)

    if (!listing) {
      listing = fetch(`/bin/ls${path}index.turbo_frame.html`)
        .then((response) => response.ok ? response.text() : "")
        .catch(() => "")
        .then((html) => this.parseListing(html))

      this.listings.set(path, listing)
    }

    return listing
  }

  private moveCaret(input: HTMLElement, offset: number) {
    let val = input.firstChild
    let range = document.createRange()

    if (val) range.setStart(val, Math.min(offset, val.textContent?.length || 0))
    else range.setStart(input, 0)

    range.collapse(true)

    let selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  private parseListing(html: string): DirectoryEntry[] {
    let listing = new DOMParser().parseFromString(html, "text/html")

    return Array.from(listing.querySelectorAll("li"))
      .map((item) => (item.textContent || "").trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ name: name.replace(/\/$/, ""), directory: name.endsWith("/") }))
  }

  private pathFromCwd(val: string) {
    return val.startsWith("/") ? val : this.cwdTarget.dataset.cwd + val
  }

  // The directory a half-typed path points at, with `.` and `..` folded away so
  // it can be turned straight into an `ls` URL.
  private resolveDir(path: string) {
    let segments: string[] = []

    for (let segment of this.pathFromCwd(path).split("/")) {
      if (segment == "" || segment == ".") continue

      if (segment == "..") segments.pop()
      else segments.push(segment)
    }

    return segments.length > 0 ? `/${segments.join("/")}/` : "/"
  }

  private showHistory(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()
    ev.target.innerHTML = this.historyValue[this.historyIndexValue - 1] || ""

    const sel = window.getSelection()
    sel?.selectAllChildren(ev.target)
    sel?.collapseToEnd()
  }

  private wordStart(val: string, caret: number) {
    return val.slice(0, caret).search(/\S*$/)
  }
}
