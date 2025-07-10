export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'text/markdown', 'text/html'] as const
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.txt', '.md', '.html'] as const

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/html': ['.html']
} as const
