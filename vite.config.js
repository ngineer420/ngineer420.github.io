import { defineConfig } from 'vite'

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        projects: 'projects/index.html',
        notFound: '404.html'
      }
    }
  }
})