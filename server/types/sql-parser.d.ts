declare module 'sql-parser' {
  export const Parser: {
    parse: (sql: string) => any;
  };
}