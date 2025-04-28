// This is a more comprehensive dummy declaration file to satisfy TypeScript
// It doesn't affect runtime behavior, only compilation

declare module 'mysql2/promise' {
  export interface Connection {
    execute: any;
    query: any;
    end: () => Promise<void>;
  }

  export interface Pool {
    getConnection: () => Promise<Connection>;
    execute: any;
    query: any;
    end: () => Promise<void>;
  }

  export function createConnection(config: any): Promise<Connection>;
  export function createPool(config: any): Pool;
}
