import { Controller } from "@hotwired/stimulus"

export default class extends Controller<HTMLElement> {
  static targets = [ "cli", "dir", "output" ]

  declare readonly cliTarget: HTMLInputElement
  declare readonly cliTargets: HTMLInputElement[]
  declare readonly dirTarget: HTMLElement
  declare readonly dirTargets: HTMLElement[]
  declare readonly hasCliTarget: boolean
  declare readonly hasDirTarget: boolean
  declare readonly hasOutputTarget: boolean
  declare readonly outputTarget: HTMLElement
  declare readonly outputTargets: HTMLElement[]

  handle404(ev: any) {
    if (ev.detail.fetchResponse.response.status == 404) {
      ev.preventDefault()
      this.clear()

      let url = new URL(ev.detail.fetchResponse.response.url)

      let args = url.pathname.replace('/index.turbo_frame.html', '')
                    .split('/').filter(String)

      let cmd = args.shift()

      if (args.length > 0) {
        cmd += ` /${args.join("/")}`
      }

      this.outputTarget.innerHTML = 
        `Command/path not found: <strong>${cmd}</strong><br/>`
    }
  }

  submit(ev: any) {
    ev.preventDefault()
    let args = ev.target.value.split(" ")
    let cmd = args.shift()
    let path = this.path(args.join(" "))
    let frame = cmd == 'cd' ? 'input' : 'output'

    this.goTo(cmd + path, frame)
  }

  private basePath() {
    return this.dirTarget.dataset?.dir || '/'
  }

  private clear() {
    this.cliTarget.value = ""
    this.outputTarget.innerHTML = ""
  }

  private goTo(path: string, target: string) {
    let anchor = document.createElement('a')
    anchor.href = path
    anchor.dataset.turboFrame = target

    this.element.appendChild(anchor)
    this.clear()

    anchor.click()
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
