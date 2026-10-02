import {createServer} from 'node:http'
import {fileURLToPath} from 'node:url'
import {gzipSync} from 'node:zlib'
import {addMocksToSchema} from '@graphql-tools/mock'
import {SchemaBuilder} from '@subsquid/openreader/lib/dialect/opencrud/schema.js'
import {loadModel} from '@subsquid/openreader/lib/tools.js'
import {getNullableType, isListType, isNonNullType, isObjectType} from 'graphql'
import {createYoga} from 'graphql-yoga'
import data from './data.js'

const model = loadModel(fileURLToPath(new URL('../squid/schema.graphql', import.meta.url)))
const schema = new SchemaBuilder({model}).build()

const HEX = '0x' + '0'.repeat(64)
const CURVE = {__kind: 'LinearDecreasing', length: 1e9, floor: 5e8, ceil: 1e9}

const gzipHex = array => '0x' + gzipSync(Buffer.from(array.buffer)).toString('hex')
const OCTAHEDRON_VERTICES = gzipHex(new Float64Array([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1]))
const OCTAHEDRON_FACES = gzipHex(new Uint16Array([0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5]))

let lastId = 0
const newId = () => '0x' + (++lastId).toString(16).padStart(64, '0')
const newExtrinsicId = () => `0000000000-00000-${String(++lastId).padStart(6, '0')}`

// fields the pages can't render from a plain default
const SHAPES = {
    Block: {workHash: HEX},
    Extrinsic: {id: newExtrinsicId},
    MinedObject: {vertices: OCTAHEDRON_VERTICES},
    MeshTopology: {faces: OCTAHEDRON_FACES},
    Referendum: {timeline: []},
    Bounty: {timeline: []},
    Track: {minApproval: CURVE, minSupport: CURVE},
    EvmTransaction: {exitReason: {__kind: 'Succeed', value: {__kind: 'Stopped'}}},
}

// lists start empty and optional fields start null, so a page shows only what data.js holds
function blank(field) {
    const type = getNullableType(field.type)
    if (isListType(type)) return []
    if (!isNonNullType(field.type)) return null
    if (isObjectType(type)) return {}
}

function defaults(type) {
    const fields = type.getFields()
    const blanks = Object.values(fields).map(f => [f.name, blank(f)]).filter(([, v]) => v !== undefined)
    return {...Object.fromEntries(blanks), ...('id' in fields && {id: newId}), ...SHAPES[type.name]}
}

const query = schema.getQueryType()
const objectTypes = Object.values(schema.getTypeMap())
    .filter(t => isObjectType(t) && !t.name.startsWith('__') && t !== query)

const mocks = {
    String: () => HEX,
    Int: () => 0,
    Float: () => 0,
    Boolean: () => false,
    BigInt: () => '1000000000000000000',
    BigDecimal: () => '1',
    DateTime: () => '2026-10-01T00:00:00.000Z',
    Bytes: () => '0x',
    JSON: () => null,
    ...Object.fromEntries(objectTypes.map(t => [t.name, () => defaults(t)])),
}

const resolve = value => typeof value === 'function' ? (_, args) => value(args) : () => value

const resolvers = {
    Query: Object.fromEntries([
        ...Object.values(query.getFields()).map(f => [f.name, blank(f)]),
        ...Object.entries(data),
    ].map(([field, value]) => [field, resolve(value)])),
}

const yoga = createYoga({schema: addMocksToSchema({schema, mocks, resolvers}), maskedErrors: false})

createServer(yoga).listen(4350, '127.0.0.1', () => console.log('mock graphql on http://127.0.0.1:4350/graphql'))
