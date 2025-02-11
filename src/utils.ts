import fs from 'node:fs/promises'
import type stream from 'node:stream'
import { Transform, type TransformCallback } from 'node:stream'

export async function hasAccess (filePath: string) {
  return fs.access(filePath).then(() => true, () => false)
}

export function readStream (stream: stream.Writable) {
  return async () => {

  }
}

export class RunmeStream extends Transform {
  #content = Buffer.from([])

  /**
   * filter stdout of execution
   */
  #canPropagateChunk (chunk: Buffer) {
    const chunkString = chunk.toString()
    return (
      // written by console.log in exec method of @actions/exec
      !chunkString.startsWith('[command]') &&
      // error of users using z4h, see https://github.com/stateful/runme/issues/221
      !chunkString.includes('/google-cloud-sdk/completion.zsh.inc') &&
      !chunkString.includes('.nvm/bash_completion:')
    )
  }

  /**
   * filter logs from @actions/exec
   */
  _transform (chunk: Buffer, encoding: string, callback: TransformCallback) {
    if (!this.#canPropagateChunk(chunk)) {
      return callback(null)
    }
    return callback(null, chunk.toString())
  }

  write (chunk: any, encoding?: BufferEncoding | TransformCallback, cb?: TransformCallback) {
    const enc: BufferEncoding = typeof encoding === 'string' ? encoding : 'utf8'
    if (!this.#canPropagateChunk(chunk)) {
      return false
    }

    const buffer = (Buffer.isBuffer(chunk)) ? chunk : Buffer.from(chunk, enc)
    this.#content = Buffer.concat([this.#content, buffer])
    super.write(chunk, encoding as BufferEncoding, cb)
    return true
  }

  toString (encoding?: BufferEncoding) {
    return this.#content.toString(encoding)
  }
}
