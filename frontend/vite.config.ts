import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/auth": "http://localhost:9001",
            "/products": "http://localhost:9001",
            "/uploads": "http://localhost:9001",
            "/dashboard": "http://localhost:9001",
            "/customers": "http://localhost:9001",
            "/sales": "http://localhost:9001",
            "/settings": "http://localhost:9001",
            "/intelligence": "http://localhost:9001",
            "/wishlist": "http://localhost:9001",
            "/media": "http://localhost:9001",
            "/health": "http://localhost:9001"
        }
    }
});
