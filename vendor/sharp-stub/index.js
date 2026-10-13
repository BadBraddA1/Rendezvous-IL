function sharp() {
  throw new Error("sharp is not available on Cloudflare Workers")
}
sharp.default = sharp
module.exports = sharp
