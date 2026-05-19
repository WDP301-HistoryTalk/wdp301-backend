const COLORS = {
  reset: '\x1b[0m',
  info: '\x1b[36m', // Cyan
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  debug: '\x1b[90m', // Gray
};

export const logger = {
  info: (message: string, ...meta: any[]) => {
    console.log(
      `${COLORS.info}[INFO] ${new Date().toISOString()}:${COLORS.reset} ${message}`,
      meta.length ? meta : ''
    );
  },

  warn: (message: string, ...meta: any[]) => {
    console.warn(
      `${COLORS.warn}[WARN] ${new Date().toISOString()}:${COLORS.reset} ${message}`,
      meta.length ? meta : ''
    );
  },

  error: (message: string, error?: any, ...meta: any[]) => {
    console.error(
      `${COLORS.error}[ERROR] ${new Date().toISOString()}:${COLORS.reset} ${message}`,
      error ? error : '',
      meta.length ? meta : ''
    );
  },

  debug: (message: string, ...meta: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${COLORS.debug}[DEBUG] ${new Date().toISOString()}:${COLORS.reset} ${message}`,
        meta.length ? meta : ''
      );
    }
  },
};
