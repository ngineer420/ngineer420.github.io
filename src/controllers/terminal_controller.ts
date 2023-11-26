import { Controller } from "@hotwired/stimulus"

export default class extends Controller<HTMLElement> {
  static targets = [ "cli", "cwd", "output" ]

  declare readonly cliTarget: HTMLInputElement
  declare readonly cliTargets: HTMLInputElement[]
  declare readonly cwdTarget: HTMLAnchorElement
  declare readonly cwdTargets: HTMLAnchorElement[]
  declare readonly hasCliTarget: boolean
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

      this.outputTarget.innerHTML += 
        "<div><strong>Command/path not found</strong></div>"
    }
  }

  submit(ev: any) {
    ev.preventDefault()

    this.outputTarget.innerHTML += 
      `<div>${this.cwdTarget.text} ${ev.target.value}</div>`
      
    this.goTo(ev.target.value)
  }

  private cmdArgPath(val: string) {
    let path = this.pathFromCwd(val)
    
    path += path.endsWith("/") ? "" : "/"

    return path + "index.turbo_frame.html"
  }

  private goTo(val: string) {
    let args = val.split(" ")
    let cmd = args.shift()

    this.cliTarget.value = ""
    this.cwdTarget.href = `${document.baseURI}/${cmd}` 
                          + this.cmdArgPath(args.join(" "))
    this.cwdTarget.dataset.turboFrame = cmd == 'cd' ? 'input' : 'output'
    this.cwdTarget.click()
  }

  private pathFromCwd(val: string) {
    return val.startsWith("/") ? val : this.cwdTarget.dataset.cwd + val
  }
}
