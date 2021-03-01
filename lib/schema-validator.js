'use strict';

const path = require('path');
const Settings = require('@janiscommerce/settings');

const SchemaValidatorError = require('./schema-validator-error');

class SchemaValidator {

	static get schemaPath() {

		const schemaValidatorSettings = Settings.get('schemaValidator');

		const schemaPath = schemaValidatorSettings && schemaValidatorSettings.schemaPath ? schemaValidatorSettings.schemaPath : false;

		const filePath = schemaPath || 'schemas/build/public.json';

		return path.join(process.cwd(), filePath);
	}

	static get valdiateClientSchemaField() {
		return 'x-validate-client';
	}

	static get valdiateLoggedSchemaField() {
		return 'x-validate-logged';
	}

	static getAuthorizationHeaders() {
		const schemaValidatorSettings = Settings.get('schemaValidator');
		return schemaValidatorSettings && schemaValidatorSettings.securitySchemes ? schemaValidatorSettings.securitySchemes : [];
	}

	get getAuthorizationHeaders() {
		return this.constructor.getAuthorizationHeaders;
	}

	static get verbs() {
		return ['get', 'put', 'post', 'patch', 'delete', 'options'];
	}

	get paths() {
		return this.constructor.paths;
	}

	constructor(endpoint, verb = 'get') {
		this.endpoint = this.constructor.fixEndpoint(endpoint);
		this.verb = verb;
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

		const securitySchemes = (schema.components && schema.components.securitySchemes) || {};

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

				this.paths[fixedEndpoint][verb].shouldValidateApiSecuritySchemas = this.hasToValidateApiSecured(endpointData[verb], securitySchemes);
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

		if(!this.isValidVerb())
			throw new SchemaValidatorError('Invalid verb', SchemaValidatorError.codes.INVALID_VERB);

		this.verb = this.verb.toLowerCase();

		if(!this.paths)
			this.constructor.cachePaths();

		if(typeof this.paths[this.endpoint] === 'undefined')
			throw new SchemaValidatorError('Endpoint not found in schema.paths', SchemaValidatorError.codes.ENDPOINT_NOT_FOUND);

		if(!this.paths[this.endpoint][this.verb])
			throw new SchemaValidatorError(`Verb '${this.verb}' not found in schema for endpoint`, SchemaValidatorError.codes.VERB_NOT_FOUND);

		return true;
	}

	isValidVerb() {
		return typeof this.verb === 'string'
			&& this.constructor.verbs.includes(this.verb.toLowerCase());
	}

	static hasToValidateApiSecured(endpointData, securitySchemes) {

		if(!endpointData.security)
			return false;

		const [endpointSecuritySchemes] = endpointData.security;

		for(const authorizationHeader of this.getAuthorizationHeaders()) {

			const securitySchemeName = this.getSecuritySchemesComponent(authorizationHeader, securitySchemes);

			if(!endpointSecuritySchemes[securitySchemeName])
				return false;
		}

		return true;
	}

	static getSecuritySchemesComponent(securitySchemeName, securitySchemes) {

		for(const [securitySchemeComponentName, securitySchemeComponentValue] of Object.entries(securitySchemes)) {

			if(!securitySchemeComponentValue.name || securitySchemeComponentValue.name !== securitySchemeName)
				continue;

			return securitySchemeComponentName;
		}

		return false;
	}

	shouldValidateClient() {
		this.validate();
		return !!this.paths[this.endpoint][this.verb].shouldValidateClient;
	}

	shouldValidateLogged() {
		this.validate();
		return !!this.paths[this.endpoint][this.verb].shouldValidateLogged;
	}

	shouldValidateApiSecuritySchemas() {
		this.validate();
		return !!this.paths[this.endpoint][this.verb].shouldValidateApiSecuritySchemas;
	}

}

module.exports = SchemaValidator;
