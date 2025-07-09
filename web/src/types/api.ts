export type TSuccess<Data = undefined> = {
  message: string
  data?: Data
  pagination?: TPagination
}

export type TError = {
  message: string
  status_code: number
  stack?: string
}

export type TPagination = {
  page: number
  page_size: number
  total_pages: number
  total_items: number
}

export type TPaginationParams = {
  page?: number
  page_size?: number
}
