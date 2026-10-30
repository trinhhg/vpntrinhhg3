export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Chuyển hướng /admin sang /admin.html nếu người dùng không gõ đuôi .html
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      const adminUrl = new URL("/admin.html", request.url);
      return env.ASSETS.fetch(new Request(adminUrl.toString(), {
        method: request.method,
        headers: request.headers
      }));
    }

    // Nếu là Link Sub hoặc API -> Bẻ lái ngầm sang con Worker Test (Nơi chứa Database)
    if (url.pathname.match(/^\/v[1-6]/) || url.pathname.startsWith("/api") || url.pathname.startsWith("/qr")) {
      const workerUrl = new URL(request.url);
      workerUrl.hostname = "vpntrinhhg3worker.lucastanora.workers.dev";
      const newRequest = new Request(workerUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: (request.method !== "GET" && request.method !== "HEAD") ? request.body : undefined
      });
      return fetch(newRequest);
    }

    // Nếu khách truy cập bình thường -> Phục vụ file giao diện tĩnh
    return env.ASSETS.fetch(request);
  }
};
