import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/route-planner/', // IMPORTANT for GitHub Pages under repo name
  server: {
    https: true, // allows `npm run dev:https` without extra flags
    host: true
  },
  preview: {
    https: true,
    host: true
  }
})
