module.exports = {
  // standard relay config options
  src: '.',
  language: 'typescript',
  schema: './lib/queries/schema.graphql',
  artifactDirectory: './lib/queries/__generated__',
  exclude: ['**/node_modules/**', '**/__mocks__/**', '**/__generated__/**'],
  // pg_graphql specific options
  schemaConfig: {
    nodeInterfaceIdField: 'nodeId',
    nodeInterfaceIdVariableName: 'nodeId',
  },
  customScalarTypes: {
    UUID: 'string',
    Datetime: 'string',
    JSON: 'string',
    BigInt: 'string',
    BigFloat: 'string',
    Opaque: 'any',
  },
};
