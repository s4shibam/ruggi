export type TEnv = {
  nodeEnv: 'development' | 'production'
  apiUrl: string | 'http://localhost:8000'
  appSlug: string | 'NA'
}

export const env = {
  nodeEnv: import.meta.env.NODE_ENV || 'development',
  apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  appSlug: import.meta.env.VITE_APP_SLUG || 'NA'
}
