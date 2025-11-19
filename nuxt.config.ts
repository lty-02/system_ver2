export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  
  css: ['~/assets/css/main.css'],
  
  runtimeConfig: {
    arcgisUsername: '',
    arcgisPassword: '',
    public: {
      arcgisPortalUrl: 'https://igisportal.geomatics.ncku.edu.tw/portal',
      websceneId: '2ae01d33fe194607b721072b1c10dc1a',
    }
  },

  compatibilityDate: '2025-01-20'
})