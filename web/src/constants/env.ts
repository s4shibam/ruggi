export type TEnv = {
  nodeEnv: 'development' | 'production'
  apiUrl: string | 'http://localhost:8000'
  appSlug: string | 'NA'
}

export const env = {
  nodeEnv: import.meta.env.VITE_NODE_ENV || 'development',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  appSlug: import.meta.env.VITE_APP_SLUG || 'NA'
}
