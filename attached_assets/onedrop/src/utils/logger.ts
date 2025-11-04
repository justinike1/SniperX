export const log = {
  info: (...a: any[]) => console.log(new Date().toISOString(), 'INFO', ...a),
  warn: (...a: any[]) => console.warn(new Date().toISOString(), 'WARN', ...a),
  error: (...a: any[]) => console.error(new Date().toISOString(), 'ERROR', ...a),
};
