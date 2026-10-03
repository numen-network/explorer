import {fileURLToPath} from 'node:url'
import {SchemaBuilder} from '@subsquid/openreader/lib/dialect/opencrud/schema.js'
import {loadModel} from '@subsquid/openreader/lib/tools.js'
import {printSchema} from 'graphql'

export const schema = new SchemaBuilder({model: loadModel(fileURLToPath(new URL('../squid/schema.graphql', import.meta.url)))}).build()

export const sdl = printSchema(schema)
