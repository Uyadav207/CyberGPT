// Backend URL configuration with fallbacks
const getBackendUrl = () => {
  const nodeEnv = import.meta.env.VITE_NODE_ENV;
  
  if (nodeEnv === "development") {
    return import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:8001";
  } else {
    // Production - use the actual deployed backend URL
    return import.meta.env.VITE_PRODUCTION_BACKEND_BASE_URL || "https://cybergpt-sable.vercel.app";
  }
};

export const BASE_URL = getBackendUrl();

// Debug logging
console.log("🔧 Frontend Backend Configuration:", {
  NODE_ENV: import.meta.env.VITE_NODE_ENV,
  BASE_URL: BASE_URL,
  VITE_BACKEND_BASE_URL: import.meta.env.VITE_BACKEND_BASE_URL,
  VITE_PRODUCTION_BACKEND_BASE_URL: import.meta.env.VITE_PRODUCTION_BACKEND_BASE_URL,
});
