export abstract class MCPConnector {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract callTool(name: string, args: any): Promise<any>;
  abstract request(method: string, params: any): Promise<any>;
  abstract getServerId(): string;
  abstract isConnected(): boolean;
} 