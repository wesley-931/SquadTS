import axios, { Method } from 'axios';
import Logger from '../../core/logger.js';

export interface AwnAPIOptions {
  orgID: string;
  creds: {
    username: string;
    password?: string;
  };
}

export interface AwnResponse {
  status: number;
  statusText?: string;
  data?: unknown;
  error?: unknown;
  success?: boolean;
}

export default class AwnAPI {
  public orgID: string;
  public xAuthToken: string | null = null;

  constructor(options: AwnAPIOptions) {
    this.orgID = options.orgID;
  }

  async auth(options: AwnAPIOptions): Promise<void> {
    const requestData = {
      username: `${options.creds.username}`,
      password: `${options.creds.password}`,
    };
    const res = await this.request('post', '/v5/auth/login', requestData);

    if (res.status === 200 && res.data?.valid) {
      this.xAuthToken = res.data.accessToken;
      Logger.verbose('awnAPI', 1, `Authentication succeeded.`);
    }
  }

  async request(
    method: Method | string,
    endpoint: string,
    data?: unknown,
  ): Promise<AwnResponse> {
    let ret: AwnResponse;

    if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;
    if (!endpoint.startsWith('/v5/'))
      endpoint = `/v5/org/${this.orgID}${endpoint}`;
    if (endpoint.includes(':orgId'))
      endpoint = endpoint.replace(':orgId', `${this.orgID}`);

    try {
      const axiosRequest = {
        method: method as Method,
        url: `https://api.awn.gg${endpoint}`,
        data: data,
        headers: { 'X-AWN-ACCESS-TOKEN': this.xAuthToken || '' },
      };

      Logger.verbose(
        'awnAPI',
        1,
        `${axiosRequest.method.toString().toUpperCase()}: ${axiosRequest.url}`,
      );
      Logger.verbose('awnAPI', 3, `Request Data: ${JSON.stringify(data)}`);

      const res = await axios(axiosRequest);

      ret = { status: res.status, statusText: res.statusText, data: res.data };
      Logger.verbose('awnAPI', 3, `${JSON.stringify(ret)}`);
      return ret;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          statusText?: string;
          data?: { error?: unknown };
        };
        message?: string;
      };
      ret = {
        status: axiosErr.response?.status || 500,
        statusText: axiosErr.response?.statusText || 'Error',
        error: axiosErr.response?.data?.error || axiosErr.message,
      };
      Logger.verbose(
        'awnAPI',
        1,
        `ERROR: ${JSON.stringify(err.response?.status)}`,
      );
      Logger.verbose('awnAPI', 3, `ERROR: ${JSON.stringify(ret)}`);
      return ret;
    }
  }

  async addAdmin(listID: string, steamID: string): Promise<AwnResponse> {
    const ret = await this.request(
      'post',
      `game-servers/admin-lists/${listID}/admins`,
      {
        type: 'steam64',
        value: `${steamID}`,
      },
    );
    ret.success = ret.status === 200;
    return ret;
  }

  async getAdmin(listID: string, adminID: string): Promise<AwnResponse> {
    const ret = await this.request(
      'get',
      `game-servers/admin-lists/${listID}/admins/${adminID}`,
    );
    ret.success = ret.status === 200;
    return ret;
  }

  async removeAdmin(listID: string, adminID: string): Promise<AwnResponse> {
    const ret = await this.request(
      'delete',
      `game-servers/admin-lists/${listID}/admins/${adminID}`,
    );
    ret.success = ret.status === 204;
    return ret;
  }

  async getAdminList(listID: string): Promise<AwnResponse> {
    const ret = await this.request('get', `game-servers/admin-lists/${listID}`);
    ret.success = ret.status === 200;
    return ret;
  }
}
