import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex} from '@noble/hashes/utils.js'

export const blake2_256 = (data: Uint8Array) => '0x' + bytesToHex(blake2b(data, {dkLen: 32}))
