import chalk from 'chalk';

type ChalkInstance = typeof chalk;

const timestamp = () => chalk.gray(`[${new Date().toLocaleTimeString()}]`);

export const logger = {
  info: (message: string, ...meta: unknown[]) => {
    console.log(
      chalk.cyan.bold('ℹ INFO'),
      timestamp(),
      message,
      meta.length ? meta : ''
    );
  },

  success: (message: string, ...meta: unknown[]) => {
    console.log(
      chalk.green.bold('✔ SUCCESS'),
      timestamp(),
      message,
      meta.length ? meta : ''
    );
  },

  warn: (message: string, ...meta: unknown[]) => {
    console.warn(
      chalk.yellow.bold('⚠ WARN'),
      timestamp(),
      message,
      meta.length ? meta : ''
    );
  },

  error: (message: string, error?: unknown, ...meta: unknown[]) => {
    console.error(
      chalk.red.bold('✖ ERROR'),
      timestamp(),
      chalk.red(message),
      error ? '\n' + chalk.redBright(error instanceof Error ? error.stack : String(error)) : '',
      meta.length ? meta : ''
    );
  },

  debug: (message: string, ...meta: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        chalk.magenta.bold('◆ DEBUG'),
        timestamp(),
        chalk.magenta(message),
        meta.length ? meta : ''
      );
    }
  },

  api: {
    request: (method: string, url: string, body?: unknown) => {
      const methodColor = getMethodColor(method);
      console.log(
        chalk.blue.bold('→ REQUEST'),
        timestamp(),
        methodColor(method.padEnd(6)),
        chalk.white(url),
        body && Object.keys(body).length ? chalk.gray('Body: ' + JSON.stringify(body)) : ''
      );
    },

    response: (method: string, url: string, statusCode: number, duration: number) => {
      const methodColor = getMethodColor(method);
      const statusColor = getStatusColor(statusCode);
      const durationColor = duration > 1000 ? chalk.red : duration > 500 ? chalk.yellow : chalk.green;

      console.log(
        chalk.green.bold('← RESPONSE'),
        timestamp(),
        methodColor(method.padEnd(6)),
        chalk.white(url),
        statusColor(statusCode.toString()),
        durationColor(`(${duration}ms)`)
      );
    },

    error: (method: string, url: string, statusCode: number, error: unknown, duration: number) => {
      const methodColor = getMethodColor(method);
      const durationColor = duration > 1000 ? chalk.red : duration > 500 ? chalk.yellow : chalk.green;

      console.error(
        chalk.red.bold('✖ API ERROR'),
        timestamp(),
        methodColor(method.padEnd(6)),
        chalk.white(url),
        chalk.red.bold(statusCode.toString()),
        durationColor(`(${duration}ms)`),
        '\n',
        chalk.redBright(error instanceof Error ? error.message : String(error))
      );
    }
  }
};

function getMethodColor(method: string): ChalkInstance {
  switch (method.toUpperCase()) {
    case 'GET': return chalk.blue;
    case 'POST': return chalk.green;
    case 'PUT': return chalk.yellow;
    case 'PATCH': return chalk.magenta;
    case 'DELETE': return chalk.red;
    default: return chalk.white;
  }
}

function getStatusColor(statusCode: number): ChalkInstance {
  if (statusCode >= 200 && statusCode < 300) return chalk.green.bold;
  if (statusCode >= 300 && statusCode < 400) return chalk.cyan.bold;
  if (statusCode >= 400 && statusCode < 500) return chalk.yellow.bold;
  return chalk.red.bold;
}
