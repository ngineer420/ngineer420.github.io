import "@hotwired/turbo"

import { Application } from "@hotwired/stimulus"

import AnchorController from "./controllers/anchor_controller"
import InputController from "./controllers/input_controller"
import OutputController from "./controllers/output_controller"

declare global {
  interface Window {
    Stimulus:any;
  }
}

window.Stimulus = Application.start()

window.Stimulus.register("anchor", AnchorController)
window.Stimulus.register("input", InputController)
window.Stimulus.register("output", OutputController)
