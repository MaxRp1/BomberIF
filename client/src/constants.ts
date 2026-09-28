export const ONDEV = process.env.NODE_ENV !== 'production'

export const BASENAME = '/BomberIF'

export const PAGES = {
  HOME: '/',
  ABOUT: '/about',
  HELP: '/help'
}

export const SERVER_URL = ONDEV
  ? 'https://localhost:4000'
  : 'https://bomberif-azij.onrender.com'
