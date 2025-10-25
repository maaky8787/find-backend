import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    server: {
      proxy: isProduction ? {} : {
        '/add-lost': 'http://localhost:4000',
        '/add-existing': 'http://localhost:4000',
        '/matches': 'http://localhost:4000'
      }
    },
    define: {
      // تعريف متغيرات عامة
      __API_URL__: JSON.stringify(isProduction 
        ? 'https://findmycar-backend.vercel.app'  // URL الإنتاج
        : 'http://localhost:4000'                 // URL التطوير
      )
    }
  }
})
