import { Ajv } from "ajv";

export type Test = {
    x: Aux[];
};

export type Aux = { y: number | string };

const schema = {
    $ref: "#/definitions/Test",
    $schema: "http://json-schema.org/draft-07/schema#",
    definitions: {
        Aux: {
            additionalProperties: false,
            properties: {
                y: {
                    type: ["number", "string"]
                }
            },
            required: ["y"],
            type: "object"
        },
        Test: {
            additionalProperties: false,
            properties: {
                x: {
                    items: {
                        $ref: "#/definitions/Aux"
                    },
                    type: "array"
                }
            },
            required: ["x"],
            type: "object"
        }
    }
};

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const data = {
    x: [{ y: 1 }, { y: "a" }]
};

const validate = ajv.compile(schema);
const valid = validate(data);
if (!valid) console.log(validate.errors);
