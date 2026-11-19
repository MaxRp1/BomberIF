export const ONDEV = process.env.NODE_ENV !== 'production'

export const BASENAME = '/BomberIF'

export const PAGES = {
  HOME: '/',
  ABOUT: '/about',
  HELP: '/help'
}

// REACT_APP_SERVER_URL permite apontar o cliente para outro backend
// (ex.: http://localhost:4000 quando rodando via Docker Compose).
export const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
  (ONDEV
    ? 'https://localhost:4000'
    : 'https://bomberif-azij.onrender.com')
