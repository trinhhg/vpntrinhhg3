export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Nếu là Link Sub hoặc API -> Bẻ lái ngầm sang con Worker Test (Nơi chứa Database)
      if (url.pathname.match(/^\/v[1-6]/) || url.pathname.startsWith("/api") || url.pathname.startsWith("/qr")) {
        const workerUrl = new URL(request.url);
        workerUrl.hostname = "vpntrinhhg3worker.lucastanora.workers.dev";
        const init = {
          method: request.method,
          headers: request.headers
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          init.body = request.body;
        }
        return fetch(new Request(workerUrl.toString(), init));
      }

      // Phục vụ file giao diện tĩnh trực tiếp qua env.ASSETS (để _redirects tự xử lý)
      return env.ASSETS.fetch(request);
    } catch (err) {
      return env.ASSETS.fetch(request);
    }
  }
};
