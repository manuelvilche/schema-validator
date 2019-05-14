'use strict';

const mockRequire = require('mock-require');

const assert = require('assert');
const sandbox = require('sinon').createSandbox();

const SchemaValidator = require('./../index');
const { SchemaValidatorError } = require('./../schema-validator');

/* eslint-disable prefer-arrow-callback */

describe('SchemaValidator', function() {

	const mockSchema = schema => {
		/* eslint-disable global-require, import/no-dynamic-require */
		mockRequire(SchemaValidator.schemaPath, schema);
	};

	const mockValid = () => {
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
			}
		});
	};

	afterEach(() => {
		sandbox.restore();
		mockRequire.stopAll();
		SchemaValidator.paths = null; // for cleaning cache
	});

	it('should throw when construct with invalid verb', function() {
		assert.throws(() => {
			new SchemaValidator('/api/foo', 'foo');
		}, {
			name: 'SchemaValidatorError',
			code: SchemaValidatorError.codes.INVALID_VERB
		});
	});

	it('should throw when schema not found', function() {
		assert.throws(() => {
			const schemaValidator = new SchemaValidator('/api/endpoint');
			schemaValidator.validate();
		}, {
			name: 'SchemaValidatorError',
			code: SchemaValidatorError.codes.SCHEMA_NOT_FOUND
		});
	});

	describe('should throw with invalid paths', function() {

		const testInvalidPaths = endpoint => {
			assert.throws(() => {
				const schemaValidator = new SchemaValidator(endpoint);
				schemaValidator.validate();
			}, {
				name: 'SchemaValidatorError',
				code: SchemaValidatorError.codes.INVALID_PATHS
			});
		};

		it('when \'paths\' not found in schema', function() {
			mockSchema({});
			testInvalidPaths('/api/endpoint');
		});

		it('when \'paths\' received as an array', function() {
			mockSchema({ paths: ['/api/foo'] });
			testInvalidPaths('/api/endpoint');
		});

		it('when \'paths\' received as a string', function() {
			mockSchema({ paths: 'foo' });
			testInvalidPaths('/api/endpoint');
		});
	});

	it('should throw when endpoint not found', function() {

		mockValid();

		assert.throws(() => {
			const schemaValidator = new SchemaValidator('/api/invalid-endpoint');
			schemaValidator.validate();
		}, {
			name: 'SchemaValidatorError',
			code: SchemaValidatorError.codes.ENDPOINT_NOT_FOUND
		});
	});

	it('should throw when verb not found for an endpoint', function() {

		mockValid();

		const test = (endpoint, verb) => {
			assert.throws(() => {
				const schemaValidator = new SchemaValidator(endpoint, verb);
				schemaValidator.validate();
			}, {
				name: 'SchemaValidatorError',
				code: SchemaValidatorError.codes.VERB_NOT_FOUND
			});
		};

		const spyCachePaths = sandbox.spy(SchemaValidator, 'cachePaths');

		test('/api/foo');
		sandbox.assert.calledOnce(spyCachePaths);

		test('/api/foo', 'get');
		sandbox.assert.calledOnce(spyCachePaths);

		test('/api/foo', 'post');
		sandbox.assert.calledOnce(spyCachePaths);

		test('/api/bar', 'post');
		sandbox.assert.calledOnce(spyCachePaths);
	});

	describe('should validate', function() {

		const test = (endpoint, verb) => {
			mockValid();
			const schemaValidator = new SchemaValidator(endpoint, verb);
			assert(schemaValidator.validate());
		};

		it('when found in schema', function() {
			test('/api/bar', 'get');
		});

		it('when found in schema with default verb', function() {
			test('/api/bar');
		});

		it('when found in schema ', function() {
			test('/api/bar', 'get');
		});

		it('when found in schema - api with slashes and starting with api', function() {
			test('/api/with-slashes-api/', 'get');
			test('/api/with-slashes-api', 'get');
			test('api/with-slashes-api/', 'get');
			test('api/with-slashes-api', 'get');
		});

		it('when found in schema - api with slash at start and starting with api', function() {
			test('/api/with-slash-start-api/', 'get');
			test('/api/with-slash-start-api', 'get');
			test('api/with-slash-start-api/', 'get');
			test('api/with-slash-start-api', 'get');
		});

		it('when found in schema - api with slash at end and starting with api', function() {
			test('/api/with-slash-end-api/', 'get');
			test('/api/with-slash-end-api', 'get');
			test('api/with-slash-end-api/', 'get');
			test('api/with-slash-end-api', 'get');
		});

		it('when found in schema - api without slashes api and starting with api', function() {
			test('/api/without-slashes-api/', 'get');
			test('/api/without-slashes-api', 'get');
			test('api/without-slashes-api/', 'get');
			test('api/without-slashes-api', 'get');
		});

		it('when found in schema - with slashes', function() {
			test('/with-slashes/', 'get');
			test('/with-slashes', 'get');
			test('with-slashes/', 'get');
			test('with-slashes', 'get');
		});

		it('when found in schema - with slash at start', function() {
			test('/with-slash-start/', 'get');
			test('/with-slash-start', 'get');
			test('with-slash-start/', 'get');
			test('with-slash-start', 'get');
		});

		it('when found in schema - with slash at end', function() {
			test('/with-slash-end/', 'get');
			test('/with-slash-end', 'get');
			test('with-slash-end/', 'get');
			test('with-slash-end', 'get');
		});

		it('when found in schema - without-slashes', function() {
			test('/without-slashes/', 'get');
			test('/without-slashes', 'get');
			test('without-slashes/', 'get');
			test('without-slashes', 'get');
		});

		it('when apis with resources validated', function() {
			test('categories/10');
			test('categories/10/products');
			test('categories/10/products/42');
			test('categories/10/products/42/images');
		});

	});

	it('should return \'false\' when no x-validate-client setted in schema', function() {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar');
		assert(!schemaValidator.shouldValidateClient());
	});

	it('should return \'false\' no x-validate-client setted as false', function() {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'patch');
		assert(!schemaValidator.shouldValidateClient());
	});

	it('should return \'true\' no x-validate-client setted as true', function() {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'options');
		assert(schemaValidator.shouldValidateClient());
	});

	it('should return \'false\' when no x-validate-logged setted in schema', function() {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar');
		assert(!schemaValidator.shouldValidateLogged());
	});

	it('should return \'false\' no x-validate-logged setted as false', function() {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'patch');
		assert(!schemaValidator.shouldValidateLogged());
	});

	it('should return \'true\' no x-validate-logged setted as true', function() {
		mockValid();
		const schemaValidator = new SchemaValidator('/api/bar', 'options');
		assert(schemaValidator.shouldValidateLogged());
	});
});
