import "@hotwired/turbo"

import { Application } from "@hotwired/stimulus"

import HelloController from "./controllers/hello_controller"

declare global {
  interface Window {
    Stimulus:any;
  }
}

window.Stimulus = Application.start()

window.Stimulus.register("hello", HelloController)
