import { createApp } from "vue"
import App from "./App.vue"
import router from "./router.js"
import MintUI from "mint-ui"
import "mint-ui/lib/style.css"
import "./styles/base.css"
import "./styles/mint-overrides.css"

const app = createApp(App)
app.use(router)
app.use(MintUI)
app.mount("#app")
