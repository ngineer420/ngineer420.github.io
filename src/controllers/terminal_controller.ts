 import { Controller } from "@hotwired/stimulus"

export default class extends Controller<HTMLElement> {
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

      this.outputTarget.innerHTML += 
        "<div><strong>Command/path not found</strong></div>"
    }
  }

  submit(ev: any) {
    ev.preventDefault()

    let cmd = ev.target.value

    this.outputTarget.innerHTML += `<div>${this.cwdTarget.text} ${cmd}</div>`
    ev.target.value = ""
      
    this.goTo(cmd)
  }

  private goTo(val: string) {
    let args = val.split(" ")
    let cmdPath = this.pathFromCwd(args.pop() || "")

    this.cwdTarget.href = `${document.baseURI}${cmdPath}`
    this.cwdTarget.href += this.cwdTarget.href.endsWith("/") ? "" : "/"

    if (args.length > 0) {
      this.cwdTarget.href += `${args.join("/")}/`
    }

    this.cwdTarget.href += "index.turbo_frame.html"

    this.cwdTarget.dataset.turboFrame = args[0] == 'cd' ? 'input' : 'output'

    this.cwdTarget.click()
  }

  private pathFromCwd(val: string) {
    return val.startsWith("/") ? val : this.cwdTarget.dataset.cwd + val
  }
}
