export declare class CandidateProfileSchemaController {
    getSchema(): {
        readonly $schema: "http://json-schema.org/draft-07/schema#";
        readonly title: "CandidateProfile";
        readonly description: "v1 schema for a serialized CandidateProfile";
        readonly type: "object";
        readonly required: readonly ["schema_version", "id", "job_id", "name", "contact", "work_experience", "education", "skills", "summary", "parse_status", "created_at"];
        readonly properties: {
            readonly schema_version: {
                readonly type: "string";
                readonly const: "1";
            };
            readonly id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly job_id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly name: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly contact: {
                readonly type: "object";
                readonly required: readonly ["email"];
                readonly properties: {
                    readonly email: {
                        readonly type: "string";
                    };
                    readonly phone: {
                        readonly type: readonly ["string", "null"];
                    };
                    readonly location: {
                        readonly type: readonly ["string", "null"];
                    };
                };
                readonly additionalProperties: false;
            };
            readonly work_experience: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["company", "title", "start_date", "description"];
                    readonly properties: {
                        readonly company: {
                            readonly type: "string";
                        };
                        readonly title: {
                            readonly type: "string";
                        };
                        readonly start_date: {
                            readonly type: "string";
                        };
                        readonly end_date: {
                            readonly type: readonly ["string", "null"];
                        };
                        readonly description: {
                            readonly type: "string";
                        };
                    };
                    readonly additionalProperties: false;
                };
            };
            readonly education: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["institution", "degree", "field"];
                    readonly properties: {
                        readonly institution: {
                            readonly type: "string";
                        };
                        readonly degree: {
                            readonly type: "string";
                        };
                        readonly field: {
                            readonly type: "string";
                        };
                        readonly graduation_year: {
                            readonly type: readonly ["integer", "null"];
                        };
                    };
                    readonly additionalProperties: false;
                };
            };
            readonly skills: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["canonical_name", "raw_aliases"];
                    readonly properties: {
                        readonly canonical_name: {
                            readonly type: "string";
                        };
                        readonly raw_aliases: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly additionalProperties: false;
                };
            };
            readonly summary: {
                readonly type: "string";
            };
            readonly parse_status: {
                readonly type: "string";
                readonly enum: readonly ["success", "error"];
            };
            readonly error_message: {
                readonly type: readonly ["string", "null"];
            };
            readonly created_at: {
                readonly type: "string";
            };
        };
        readonly additionalProperties: false;
    };
}
