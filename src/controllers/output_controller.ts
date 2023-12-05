import { Controller } from "@hotwired/stimulus"

export default class extends Controller<HTMLElement> {
  clear(ev: CustomEvent | KeyboardEvent) {
    ev.preventDefault()

    this.element.innerHTML = ""
  }

  handle404(ev: CustomEvent) {
    if (ev.detail.fetchResponse.response.status == 404) {
      ev.preventDefault()

      this.append("<strong>Command/path not found</strong>")
    }
  }

  setRenderToAppend(ev: CustomEvent) {
    ev.detail.render = (currentElement: HTMLElement, newElement: HTMLElement) => {
      currentElement.append(...newElement.children)
    }
  }

  stdOut(ev: CustomEvent) {
    ev.preventDefault()

    this.append(ev.detail.htmlStr)
  }

  private append(htmlStr: string) {
    let output = document.createElement("div")
    output.innerHTML = htmlStr

    this.element.appendChild(output)
  }
}