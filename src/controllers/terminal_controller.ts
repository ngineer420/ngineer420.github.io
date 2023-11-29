 import { Controller } from "@hotwired/stimulus"

export default class TerminalController extends Controller<HTMLElement> {
  static inferredPathCmds = [ "ls", "pwd" ]
  static targets = [ "cwd", "output" ]

  declare readonly cwdTarget: HTMLAnchorElement
  declare readonly cwdTargets: HTMLAnchorElement[]
  declare readonly hasCwdTarget: boolean
  declare readonly hasOutputTarget: boolean
  declare readonly outputTarget: HTMLElement
  declare readonly outputTargets: HTMLElement[]

  appendOutput(ev: any) {
    ev.detail.render = (currentElement: HTMLElement, newElement: HTMLElement) => {
      while (newElement.children.length > 0) {
        currentElement.appendChild(newElement.children[0])
      }
    }
  }

  handle404(ev: any) {
    if (ev.detail.fetchResponse.response.status == 404) {
      ev.preventDefault()

      this.stdOut("<strong>Command/path not found</strong>")
    }
  }

  submit(ev: any) {
    ev.preventDefault()

    let cmd = ev.target.value
    ev.target.value = ""

    if (cmd == "clear") {
      this.outputTarget.innerHTML = ""
    }
    else {
      this.stdOut(`${this.cwdTarget.text} ${cmd}`)
      
      this.goTo(cmd)
    }
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
    let inferPath = TerminalController.inferredPathCmds.includes(cmd)
    
    let dirPath = args.length > 0 || inferPath
                  ? this.pathFromCwd(args.join("/"))
                  : "/"
    
    dirPath += dirPath.endsWith("/") ? "" : "/"

    return `${cmdArgs.join("/")}${dirPath}`
  }

  private goTo(val: string) {
    let path = this.cmdPath(val).substring(1)

    this.cwdTarget.href = `${document.baseURI}${path}index.turbo_frame.html`

    this.cwdTarget.dataset.turboFrame = path.startsWith("bin/cd/")
                                        ? 'input' 
                                        : 'output'

    this.cwdTarget.click()
  }

  private pathFromCwd(val: string) {
    return val.startsWith("/") ? val : this.cwdTarget.dataset.cwd + val
  }

  private stdOut(val: string) {
    let output = document.createElement("div")
    output.innerHTML = val

    this.outputTarget.appendChild(output)
  }
}
