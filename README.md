# Schema Validator

Schema Validator is a module that allows validate endpoints against a local schema.
The schema must be a `JSON` in OpenAPI 3.0
The file must be located in `path/to/root/schemas/build/public.json`.
The endpoints will be validated in `paths` by endpoint and verb.

## Installation

```
npm install @janiscommerce/schema-validator
```

## API

- `new SchemaValidator( endpoint, [ verb ] )`
Constructs de Validator.
Validates the verb format and to be included in `['get', 'put', 'post', 'patch', 'delete', 'options']`.
In case that the verb is not valid, will throw a `SchemaValidatorError`.

- `validate()`
Validates endpoint and verb exists in schema paths.

- `shouldValidateClient()`
Determinates if the endpoint should validate client.
To configure this, you can add an optional field `x-validate-client: Boolean` in `schema.paths[myEndpoint][myVerb]`

- `shouldValidateLogged()`
Determinates if the endpoint should validate logged.
To configure this, you can add an optional field `x-validate-logged: Boolean` in `schema.paths[myEndpoint][myVerb]`

## Errors

The errors are informed with a `SchemaValidatorError`.
This object has a `code` that can be useful for a correct error handling.
The codes are the following:
|Code	|Description						|
|-----|-----------------------------|
|1		|Invalid verb 						|
|2		|Schema not found 				|
|3		|Invalid paths in schema 		|
|4		|Endpoint not found 				|
|5		|Verb not found for endpoint 	|

## Usage

```js
const SchemaValidator = require('@janiscommerce/schema-validator');

const schemaValidatorValid = new SchemaValidator('api/valid-endpoint'); // default verb: 'get'

schemaValidatorValid.validate(); // expected output: true

const schemaValidatorInvalid = new SchemaValidator('api/invalid-endpoint', 'post');

schemaValidatorInvalid.validate(); // throws a SchemaValidatorError: Endpoint not found in schema.paths
```