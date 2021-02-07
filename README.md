# Schema Validator
![Build Status](https://github.com/janis-commerce/schema-validator/workflows/Build%20Status/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/schema-validator/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/schema-validator?branch=master)
[![npm version](https://badge.fury.io/js/%40janiscommerce%2Fschema-validator.svg)](https://www.npmjs.com/package/@janiscommerce/schema-validator)

Schema Validator is a module that allows validate endpoints against a local schema.\
The schema must be a `JSON` in OpenAPI 3.0\
The endpoints will be validated in `paths` by endpoint and verb.

## Installation

```
npm install @janiscommerce/schema-validator
```

## Configuration file

You could configure the `schemaFilePath` config in your services using the package [@janiscommerce/settings](https://www.npmjs.com/package/@janiscommerce/settings) in the `schemaValidator` key. The path default it will be `path/to/root/schemas/build/public.json`.

```json
{
	"schemaValidator": {
		"schemaPath": "schemas/public.json",
		"securitySchemas": [
			"api-key", "api-secret"
		]
	}
}
```

## API

- `new SchemaValidator( endpoint, [ verb ] )`\
Constructs de Validator.\
Validates the verb format and to be included in `['get', 'put', 'post', 'patch', 'delete', 'options']`.\
In case that the verb is not valid, will throw a `SchemaValidatorError`.

- `validate()`\
Validates endpoint and verb exists in schema paths.

- `shouldValidateClient()`\
Determinates if the endpoint should validate client.\
To configure this, you can add an optional field `x-validate-client: Boolean` in `schema.paths[myEndpoint][myVerb]`

- `shouldValidateLogged()`\
Determinates if the endpoint should validate logged.\
To configure this, you can add an optional field `x-validate-logged: Boolean` in `schema.paths[myEndpoint][myVerb]`

- `shouldValidateApiSecuritySchemas()`\
Determinates if the endpoint should validate the security schemas.\
To use this method, you must add an array field using the package [@janiscommerce/settings](https://www.npmjs.com/package/@janiscommerce/settings) inside the key `schemaValidator` you must add a property `securitySchemas` in order to validate the schema. Then in your API you must add the field `security: <Array>` and the component `securitySchems` of your service. See more [Open API Speficication](http://spec.openapis.org/oas/v3.0.3#security-scheme-object)

## Errors

The errors are informed with a `SchemaValidatorError`.\
This object has a `code` that can be useful for a correct error handling.\
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