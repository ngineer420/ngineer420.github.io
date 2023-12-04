import "@hotwired/turbo"

import { Application } from "@hotwired/stimulus"

import AnchorController from "./controllers/anchor_controller"
import TerminalController from "./controllers/terminal_controller"

declare global {
  interface Window {
    Stimulus:any;
  }
}

window.Stimulus = Application.start()

window.Stimulus.register("anchor", AnchorController)
window.Stimulus.register("terminal", TerminalController)
