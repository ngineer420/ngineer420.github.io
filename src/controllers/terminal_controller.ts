import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  submit(ev) {
    let path = window.location.pathname 
               + ev.target.value.split(" ").join("/") 
               + "/index.turbo_frame.html"

    let anchor = document.createElement('a')
    anchor.href = path

    this.element.appendChild(anchor)

    anchor.click()
  }
}
