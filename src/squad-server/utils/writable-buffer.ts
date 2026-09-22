import { Writable, WritableOptions } from 'stream';

export class WritableBuffer extends Writable {
  private data: Buffer[] = [];

  constructor(options?: WritableOptions) {
    super(options);
  }

  override _write(
    chunk: Buffer | string | Uint8Array,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.data.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
    );
    callback();
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.data);
  }

  override toString(encoding: BufferEncoding = 'utf8'): string {
    return this.getBuffer().toString(encoding);
  }
}

export default WritableBuffer;
