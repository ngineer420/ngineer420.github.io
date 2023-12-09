import { Controller } from "@hotwired/stimulus"

export default class InputController extends Controller<HTMLElement> {
  static inferredPathCmds = [ "/bin/ls", "/bin/pwd" ]
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

  clear(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()

    ev.target.innerHTML = ""
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

  private pathFromCwd(val: string) {
    return val.startsWith("/") ? val : this.cwdTarget.dataset.cwd + val
  }

  private showHistory(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()
    ev.target.innerHTML = this.historyValue[this.historyIndexValue - 1] || ""

    const sel = window.getSelection()
    sel?.selectAllChildren(ev.target)
    sel?.collapseToEnd()
  }
}