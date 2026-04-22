import { onRequestPost as __api_pin_verify_js_onRequestPost } from "D:\\Project\\bnsd\\functions\\api\\pin\\verify.js"
import { onRequestGet as __api_missa_js_onRequestGet } from "D:\\Project\\bnsd\\functions\\api\\missa.js"
import { onRequestGet as __api_sharing_js_onRequestGet } from "D:\\Project\\bnsd\\functions\\api\\sharing.js"
import { onRequestPost as __api_sharing_js_onRequestPost } from "D:\\Project\\bnsd\\functions\\api\\sharing.js"

export const routes = [
    {
      routePath: "/api/pin/verify",
      mountPath: "/api/pin",
      method: "POST",
      middlewares: [],
      modules: [__api_pin_verify_js_onRequestPost],
    },
  {
      routePath: "/api/missa",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_missa_js_onRequestGet],
    },
  {
      routePath: "/api/sharing",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_sharing_js_onRequestGet],
    },
  {
      routePath: "/api/sharing",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_sharing_js_onRequestPost],
    },
  ]