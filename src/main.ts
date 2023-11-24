import "@hotwired/turbo"

import { Application } from "@hotwired/stimulus"

import TerminalController from "./controllers/terminal_controller"

declare global {
  interface Window {
    Stimulus:any;
  }
}

window.Stimulus = Application.start()

window.Stimulus.register("terminal", TerminalController)
