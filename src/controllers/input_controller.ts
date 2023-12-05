import { Controller } from "@hotwired/stimulus"

export default class InputController extends Controller<HTMLElement> {
  static inferredPathCmds = [ "ls", "pwd" ]
  static targets = [ "cwd" ]

  declare readonly cwdTarget: HTMLAnchorElement
  declare readonly cwdTargets: HTMLAnchorElement[]
  declare readonly hasCwdTarget: boolean

  clear(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()

    ev.target.innerHTML = ""
  }

  enterCmd(ev: Event & { target: HTMLElement }) {
    ev.preventDefault()

    let cmdVal = ev.target.innerText.trimRight()

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

  private cmdPath(val: string) {
    let args = val.split(" ")
    let cmdArgs = []

    if (args[0] == "sudo") {
      cmdArgs.push(args.shift())
    }

    cmdArgs = [...[args.shift()], ...cmdArgs]

    if (!cmdArgs[0]?.startsWith("/")) {
      cmdArgs[0] = cmdArgs[0]?.includes("/") 
                ? this.pathFromCwd(cmdArgs[0]) 
                : `/bin/${cmdArgs[0]}`
    }

    let cmd = (cmdArgs[0] || "").split("/").splice(-1)[0]
    let inferPath = InputController.inferredPathCmds.includes(cmd)
    
    let dirPath = args.length > 0 || inferPath
                  ? this.pathFromCwd(args.join("/"))
                  : "/"
    
    dirPath += dirPath.endsWith("/") ? "" : "/"

    return `${cmdArgs.join("/")}${dirPath}`
  }

  private goTo(cmdVal: string) {
    let path = this.cmdPath(cmdVal)

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
}