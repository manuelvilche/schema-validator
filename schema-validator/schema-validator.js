'use strict';

const path = require('path');

const SchemaValidatorError = require('./schema-validator-error');

class SchemaValidator {

	static get schemaPath() {
		return path.join(process.cwd(), 'schemas/build/public.json'); // TODO retrieve from setting in .json
	}

	static get valdiateClientSchemaField() {
		return 'x-validate-client';
	}

	static get valdiateLoggedSchemaField() {
		return 'x-validate-logged';
	}

	static get verbs() {
		return ['get', 'put', 'post', 'patch', 'delete', 'options'];
	}

	get paths() {
		return this.constructor.paths;
	}

	constructor(endpoint, verb = 'get') {

		this.endpoint = this.constructor.fixEndpoint(endpoint);

		if(!this.isValidVerb(verb))
			throw new SchemaValidatorError('Invalid verb', SchemaValidatorError.codes.INVALID_VERB);

		this.verb = verb.toLowerCase();
	}

	static cachePaths() {

		let schema;

		try {
			/* eslint-disable global-require, import/no-dynamic-require */
			schema = require(this.schemaPath);
		} catch(error) {
			throw new SchemaValidatorError('Schema not found', SchemaValidatorError.codes.SCHEMA_NOT_FOUND);
		}

		this.preparePaths(schema);
	}

	static preparePaths(schema) {

		this.paths = {};

		if(!schema.paths
			|| typeof schema.paths !== 'object'
			|| Array.isArray(schema.paths))
			throw new SchemaValidatorError('Invalid schema paths, schema.paths must be an object', SchemaValidatorError.codes.INVALID_PATHS);

		for(const [endpoint, endpointData] of Object.entries(schema.paths)) {

			if(typeof endpointData !== 'object'
				|| Array.isArray(endpointData))
				continue;

			const fixedEndpoint = this.fixEndpoint(endpoint);

			for(const verb of this.verbs) {

				if(!this.paths[fixedEndpoint])
					this.paths[fixedEndpoint] = {};

				if(!endpointData[verb])
					continue;

				this.paths[fixedEndpoint][verb] = {
					shouldValidateClient: !!endpointData[verb][this.valdiateClientSchemaField],
					shouldValidateLogged: !!endpointData[verb][this.valdiateLoggedSchemaField]
				};
			}
		}
	}

	static fixEndpoint(endpoint) {

		// remove slash at start
		if(endpoint.substr(0, 1) === '/')
			// /api/products/20/images -> api/products/20/images
			// /products/20/images -> products/20/images
			endpoint = endpoint.substr(1);

		// remove slash at end
		if(endpoint.substr(-1) === '/')
			// /api/products/20/images -> api/products/20/images
			// /products/20/images -> products/20/images
			endpoint = endpoint.substr(0, endpoint.length - 1);

		return endpoint
			// remove initial api/
			// api/products/20/images -> products/20/images
			.replace(/^api\//, '')
			// replace resources with {}
			// products/20/images -> [products, 20, images]
			.split('/')
			// [products, 20, images] -> [products, {}, images]
			.map((value, index) => {
				return index % 2 ? '{}' : value;
			})
			// [products, {}, images] -> products/{}/images
			.join('/');
	}

	validate() {

		if(!this.paths)
			this.constructor.cachePaths();

		if(typeof this.paths[this.endpoint] === 'undefined')
			throw new SchemaValidatorError('Endpoint not found in schema.paths', SchemaValidatorError.codes.ENDPOINT_NOT_FOUND);

		if(!this.paths[this.endpoint][this.verb])
			throw new SchemaValidatorError(`Verb '${this.verb}' not found in schema for endpoint`, SchemaValidatorError.codes.VERB_NOT_FOUND);

		return true;
	}

	isValidVerb(verb) {
		return typeof verb === 'string'
			&& this.constructor.verbs.includes(verb);
	}

	shouldValidateClient() {
		this.validate();
		return !!this.paths[this.endpoint][this.verb].shouldValidateClient;
	}

	shouldValidateLogged() {
		this.validate();
		return !!this.paths[this.endpoint][this.verb].shouldValidateLogged;
	}

}

module.exports = SchemaValidator;
