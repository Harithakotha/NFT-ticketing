export const CONFIG = {
  APP_ID: process.env.VITE_APP_ID ? parseInt(process.env.VITE_APP_ID) : 123456, // Use env var or fallback to dev
  TICKET_PRICE_MICROALGOS: 1000000, // 1 Algo
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true',
};
