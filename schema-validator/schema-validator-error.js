'use strict';

class SchemaValidatorError extends Error {

	static get codes() {

		return {
			INVALID_VERB: 1,
			SCHEMA_NOT_FOUND: 2,
			INVALID_PATHS: 3,
			ENDPOINT_NOT_FOUND: 4,
			VERB_NOT_FOUND: 5
		};
	}

	constructor(err, code) {
		super(err);
		this.message = err.message || err;
		this.code = code;
		this.name = 'SchemaValidatorError';
	}
}

module.exports = SchemaValidatorError;
