import {createServer} from 'node:http'
import {createYoga} from 'graphql-yoga'
import data from './data.js'
import {mockSchema} from './engine.js'
import {schema} from './schema.js'

const yoga = createYoga({schema: mockSchema(schema, data), maskedErrors: false})

createServer(yoga).listen(4350, '127.0.0.1', () => console.log('mock graphql on http://127.0.0.1:4350/graphql'))
