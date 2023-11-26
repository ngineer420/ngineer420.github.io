import { Controller } from "@hotwired/stimulus"

export default class extends Controller<HTMLElement> {
  static targets = [ "cli", "dir", "output" ]

  declare readonly cliTarget: HTMLInputElement
  declare readonly cliTargets: HTMLInputElement[]
  declare readonly dirTarget: HTMLAnchorElement
  declare readonly dirTargets: HTMLAnchorElement[]
  declare readonly hasCliTarget: boolean
  declare readonly hasDirTarget: boolean
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

  private basePath() {
    return this.dirTarget.dataset?.dir || '/'
  }

  private goTo(val: string) {
    let args = val.split(" ")
    let cmd = args.shift()

    this.cliTarget.value = ""
    this.dirTarget.href = `${document.baseURI}/${cmd}` 
                          + this.path(args.join(" "))
    this.dirTarget.dataset.turboFrame = cmd == 'cd' ? 'input' : 'output'
    this.dirTarget.click()
  }

  private path(val: string) {
    if (!val.startsWith("/")) {
      val = this.basePath() + val
    }

    if (!val.endsWith("/")) {
      val += "/"
    }

    return val + "index.turbo_frame.html"
  }
}
