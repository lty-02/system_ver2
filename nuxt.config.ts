export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  
  css: ['~/assets/css/main.css', '@esri/calcite-components/dist/calcite/calcite.css'],
  ssr: false, 
  
  runtimeConfig: {
    arcgisUsername: '',
    arcgisPassword: '',
    public: {
      arcgisPortalUrl: 'https://igisportal.geomatics.ncku.edu.tw/portal',
      websceneId: '2ae01d33fe194607b721072b1c10dc1a',
    },
    ldgisApId: '',
    ldgisApPswd: '',
  },

  vite: {
    ssr: {
      noExternal: ['@arcgis/core', '@esri/calcite-components']
    }
  },

  build: {
    transpile: ['@arcgis/core', '@esri/calcite-components']
  },

  app: {
    head: {
      script: [
        {
          innerHTML: `
            if (window.__VUE__) {
              window.__VUE__.config.production = true;
            }
          `,
          type: 'application/javascript'
        }
      ]
    }
  },

  compatibilityDate: '2025-01-20'
})