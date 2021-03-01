'use strict';

const path = require('path');
const sinon = require('sinon');
const assert = require('assert');
const mockRequire = require('mock-require');
const Settings = require('@janiscommerce/settings');

const { SchemaValidatorError } = require('./../lib');
const SchemaValidator = require('./../');

describe('SchemaValidator', () => {

	const mockSchema = (schema, schemaPath = false) => {

		const patch = schemaPath ? path.join(process.cwd(), schemaPath) : SchemaValidator.schemaPath;

		/* eslint-disable global-require, import/no-dynamic-require */
		mockRequire(patch, schema);
	};

	const mockValid = (schemaPath = false) => {
		mockSchema({
			paths: {
				'/api/foo': {},
				'/api/ignored': 'invalid type',
				'/api/bar': {
					get: {},
					patch: {
						'x-validate-client': false,
						'x-validate-logged': false
					},
					options: { // better have some of these
						'x-validate-client': true,
						'x-validate-logged': true
					}
				},

				'/api/secured': {
					get: {
						'x-validate-client': false
					},
					post: {
						'x-validate-client': false,
						security: [
							{
								ApiKey: [],
								ApiSecret: []
							}
						]
					}
				},

				'/api/with-slashes-api/': { get: {} },
				'/api/with-slash-start-api': { get: {} },
				'api/with-slash-end-api/': { get: {} },
				'api/without-slashes-api': { get: {} },

				'/with-slashes/': { get: {} },
				'/with-slash-start': { get: {} },
				'with-slash-end/': { get: {} },
				'without-slashes': { get: {} },

				'categories/{id}': { get: {} },
				'categories/{id}/products': { get: {} },
				'categories/{id}/products/{id}': { get: {} },
				'categories/{id}/products/{id}/images': { get: {} }
			},
			components: {
				headers: {
					someHeder: {
						description: 'some description',
						schema: {
							type: 'integer',
							minimum: 0
						}
					}
				},
				securitySchemes: {
					ApiKey: {
						type: 'apiKey',
						in: 'header',
						name: 'api-key',
						description: 'The API Key'
					},
					ApiSecret: {
						type: 'apiKey',
						in: 'header',
						name: 'api-secret',
						description: 'The API Secret'
					}
				}
			}
		}, schemaPath);
	};

	const mockWithoutSecuritySchems = () => {
		mockSchema({
			paths: {
				'/api/unsecured': {
					get: {}
				}
			}
		});
	};

	beforeEach(() => {
		this.settingsStub = sinon.stub(Settings, 'get').withArgs('schemaValidator');
	});

	afterEach(() => {
		sinon.restore();
		mockRequire.stopAll();
		SchemaValidator.paths = null; // for cleaning cache
	});

	it('should throw when construct with invalid verb', () => {
		assert.throws(() => {
			const schemaValidator = new SchemaValidator('/api/foo', 'foo');
			schemaValidator.validate();
		}, {
			name: 'SchemaValidatorError',
			code: SchemaValidatorError.codes.INVALID_VERB
		});
	});

	it('should throw when schema not found', () => {
		assert.throws(() => {
			const schemaValidator = new SchemaValidator('/api/endpoint');
			schemaValidator.validate();
		}, {
			name: 'SchemaValidatorError',
			code: SchemaValidatorError.codes.SCHEMA_NOT_FOUND
		});
	});

	describe('should throw with invalid paths', () => {

		const testInvalidPaths = endpoint => {
			assert.throws(() => {
				const schemaValidator = new SchemaValidator(endpoint);
				schemaValidator.validate();
			}, {
				name: 'SchemaValidatorError',
				code: SchemaValidatorError.codes.INVALID_PATHS
			});
		};

		it('when \'paths\' not found in schema', () => {
			mockSchema({});
			testInvalidPaths('/api/endpoint');
		});

		it('when \'paths\' received as an array', () => {
			mockSchema({ paths: ['/api/foo'] });
			testInvalidPaths('/api/endpoint');
		});

		it('when \'paths\' received as a string', () => {
			mockSchema({ paths: 'foo' });
			testInvalidPaths('/api/endpoint');
		});
	});

	it('should throw when endpoint not found', () => {

		mockValid();

		assert.throws(() => {
			const schemaValidator = new SchemaValidator('/api/invalid-endpoint');
			schemaValidator.validate();
		}, {
			name: 'SchemaValidatorError',
			code: SchemaValidatorError.codes.ENDPOINT_NOT_FOUND
		});
	});

	it('should throw when verb not found for an endpoint', () => {

		mockValid();

		const testVerbNotFoundForAnEndpoint = (endpoint, verb) => {
			assert.throws(() => {
				const schemaValidator = new SchemaValidator(endpoint, verb);
				schemaValidator.validate();
			}, {
				name: 'SchemaValidatorError',
				code: SchemaValidatorError.codes.VERB_NOT_FOUND
			});
		};

		const spyCachePaths = sinon.spy(SchemaValidator, 'cachePaths');

		testVerbNotFoundForAnEndpoint('/api/foo');
		sinon.assert.calledOnce(spyCachePaths);

		testVerbNotFoundForAnEndpoint('/api/foo', 'get');
		sinon.assert.calledOnce(spyCachePaths);

		testVerbNotFoundForAnEndpoint('/api/foo', 'post');
		sinon.assert.calledOnce(spyCachePaths);

		testVerbNotFoundForAnEndpoint('/api/bar', 'post');
		sinon.assert.calledOnce(spyCachePaths);
	});

	describe('should validate', () => {

		const test = (endpoint, verb) => {
			mockValid();
			const schemaValidator = new SchemaValidator(endpoint, verb);
			assert(schemaValidator.validate());
		};

		it('when found in schema', () => {
			test('/api/bar', 'get');
		});

		it('when found in schema with default verb', () => {
			test('/api/bar');
		});

		it('when found in schema ', () => {
			test('/api/bar', 'get');
		});

		it('when found in schema - api with slashes and starting with api', () => {
			test('/api/with-slashes-api/', 'get');
			test('/api/with-slashes-api', 'get');
			test('api/with-slashes-api/', 'get');
			test('api/with-slashes-api', 'get');
		});

		it('when found in schema - api with slash at start and starting with api', () => {
			test('/api/with-slash-start-api/', 'get');
			test('/api/with-slash-start-api', 'get');
			test('api/with-slash-start-api/', 'get');
			test('api/with-slash-start-api', 'get');
		});

		it('when found in schema - api with slash at end and starting with api', () => {
			test('/api/with-slash-end-api/', 'get');
			test('/api/with-slash-end-api', 'get');
			test('api/with-slash-end-api/', 'get');
			test('api/with-slash-end-api', 'get');
		});

		it('when found in schema - api without slashes api and starting with api', () => {
			test('/api/without-slashes-api/', 'get');
			test('/api/without-slashes-api', 'get');
			test('api/without-slashes-api/', 'get');
			test('api/without-slashes-api', 'get');
		});

		it('when found in schema - with slashes', () => {
			test('/with-slashes/', 'get');
			test('/with-slashes', 'get');
			test('with-slashes/', 'get');
			test('with-slashes', 'get');
		});

		it('when found in schema - with slash at start', () => {
			test('/with-slash-start/', 'get');
			test('/with-slash-start', 'get');
			test('with-slash-start/', 'get');
			test('with-slash-start', 'get');
		});

		it('when found in schema - with slash at end', () => {
			test('/with-slash-end/', 'get');
			test('/with-slash-end', 'get');
			test('with-slash-end/', 'get');
			test('with-slash-end', 'get');
		});

		it('when found in schema - without-slashes', () => {
			test('/without-slashes/', 'get');
			test('/without-slashes', 'get');
			test('without-slashes/', 'get');
			test('without-slashes', 'get');
		});

		it('when apis with resources validated', () => {
			test('categories/10');
			test('categories/10/products');
			test('categories/10/products/42');
			test('categories/10/products/42/images');
		});
	});

	it('should return \'false\' when no x-validate-client setted in schema', () => {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar');
		assert(!schemaValidator.shouldValidateClient());
	});

	it('should return \'false\' when x-validate-client setted as false', () => {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'patch');
		assert(!schemaValidator.shouldValidateClient());
	});

	it('should return \'true\' when x-validate-client setted as true', () => {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'options');
		assert(schemaValidator.shouldValidateClient());
	});

	it('should return \'false\' when no x-validate-logged setted in schema', () => {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar');
		assert(!schemaValidator.shouldValidateLogged());
	});

	it('should return \'false\' when x-validate-logged setted as false', () => {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'patch');
		assert(!schemaValidator.shouldValidateLogged());
	});

	it('should return \'true\' when x-validate-logged setted as true', () => {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'options');
		assert(schemaValidator.shouldValidateLogged());
	});

	it('should return \'true\' when api is secured', () => {

		mockValid();

		this.settingsStub.returns({ securitySchemes: ['api-key', 'api-secret'] });

		const schemaValidator = new SchemaValidator('/api/secured', 'post');
		assert(schemaValidator.shouldValidateApiSecuritySchemas());
	});

	it('should return \'false\' when api is secured but with wrong schema', () => {

		mockValid();

		this.settingsStub.returns({ securitySchemes: ['foo', 'bar'] });

		const schemaValidator = new SchemaValidator('/api/secured', 'post');
		assert(!schemaValidator.shouldValidateApiSecuritySchemas());
	});

	it('should return \'false\' when api is secured', () => {
		mockValid();

		this.settingsStub.returns({ securitySchemes: ['api-key', 'api-secret'] });

		const schemaValidator = new SchemaValidator('/api/secured');
		assert(!schemaValidator.shouldValidateApiSecuritySchemas());
	});

	it('should return \'false\' when has\'t securitySchemes', () => {

		mockWithoutSecuritySchems();

		this.settingsStub.returns({ securitySchemes: ['api-key', 'api-secret'] });

		const schemaValidator = new SchemaValidator('/api/unsecured');
		assert(!schemaValidator.shouldValidateApiSecuritySchemas());
	});

	describe('should return the schema validated', () => {

		it('should return the authorization headers', () => {

			mockValid();

			const apiKeys = ['api-key', 'api-secret'];

			this.settingsStub.returns({ securitySchemes: apiKeys });

			const schemaValidator = new SchemaValidator('/api/secured');
			assert.deepStrictEqual(schemaValidator.getAuthorizationHeaders(), apiKeys);

		});

		it('should return the authorization headers', () => {

			mockValid();

			this.settingsStub.returns({ securitySchemes: [] });

			const schemaValidator = new SchemaValidator('/api/foo');
			assert.deepStrictEqual(schemaValidator.getAuthorizationHeaders(), []);

		});
	});

	it('should use a custom schema path', () => {

		mockValid('schemas/public.json');

		this.settingsStub.returns({ schemaPath: 'schemas/public.json' });

		const schemaValidator = new SchemaValidator('/api/bar');
		assert(schemaValidator.validate());
	});
});
