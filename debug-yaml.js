const yaml = require('js-yaml');

const yamlContent = `
variables:
  test_number: 42
  test_string: "hello"
  test_float: 3.14
`;

const parsed = yaml.load(yamlContent);
console.log("Parsed YAML:", parsed);
console.log("Types:", {
  test_number: typeof parsed.variables.test_number,
  test_string: typeof parsed.variables.test_string,
  test_float: typeof parsed.variables.test_float
});
console.log("Values:", {
  test_number: parsed.variables.test_number,
  test_string: parsed.variables.test_string,
  test_float: parsed.variables.test_float
});