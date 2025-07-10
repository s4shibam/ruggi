import axios, { type AxiosError } from 'axios'

import { env } from '@/constants/env'

const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
})

api.interceptors.request.use(
  async (config) => {
    config.headers = config.headers || {}

    return config
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error)

    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    if (env.nodeEnv === 'development') {
      console.log('[API Response]', response)
    }

    return response.data
  },
  (error: AxiosError) => {
    console.error('[API Response Error]', error?.response?.data)

    return Promise.reject(error?.response?.data)
  }
)

export { api }
