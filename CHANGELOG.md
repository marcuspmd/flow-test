# Flow Test - Changelog

All notable changes to the Flow Test Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Postman Integration**: Convert Flow Test suites to Postman collections and import collections back into YAML using the CLI
- **Documentation Enhancement**: Comprehensive documentation improvements with practical examples
  - Created `docs/YAML_EXAMPLES.md` with 6 major testing patterns and advanced scenarios
  - Enhanced `docs/API_DOCUMENTATION.md` with detailed usage examples for all services
  - Created `docs/BEST_PRACTICES.md` with naming conventions, patterns, and maintenance guidelines
  - Created `docs/TROUBLESHOOTING.md` with comprehensive debugging and issue resolution guide
  - Updated `README.md` with enhanced examples and documentation references

### Changed
- **Reporting Flow**: O engine agora gera somente `results/latest.json`; a visualização HTML fica exclusiva no projeto `report-dashboard`
- **CI/CD**: GitHub Pages agora publica o build do `report-dashboard` sem gerar `docs/`

### Removed
- **Legacy HTML Generator**: `flow-test-html`, assets Tailwind e diretório `src/report-generator`

### Documentation
- **YAML Examples**: Added comprehensive examples covering:
  - Basic API testing with request chaining
  - Authentication flows with token management
  - CRUD operations with data validation
  - Data-driven testing with variable iteration
  - Error handling and recovery scenarios
  - Performance testing with timing assertions
  - Advanced scenarios with conditional logic and flow imports

- **API Documentation**: Enhanced with practical TypeScript examples for:
  - HttpService usage patterns
  - AssertionService validation techniques
  - CaptureService data extraction methods
  - GlobalVariablesService variable management
  - GlobalRegistryService flow coordination

- **Best Practices**: Established guidelines for:
  - Test suite organization and structure
  - Variable naming conventions
  - Error handling patterns
  - Performance optimization techniques
  - Maintenance and scalability practices

- **Troubleshooting Guide**: Comprehensive guide covering:
  - Common YAML syntax errors and solutions
  - Engine startup failures and dependency issues
  - Variable interpolation problems
  - Assertion failure debugging
  - Network and connectivity issues
  - Performance optimization techniques

## [2.0.0] - 2024-01-XX

### Added
- **Flow Import System**: Support for importing and reusing complete flows from other YAML files
- **Conditional Scenarios**: JMESPath-based conditional execution with `scenarios` property
- **Enhanced Variable System**: Hierarchical variable scope (global → imported → suite → runtime)
- **Advanced Assertions**: Support for multiple assertion types (status_code, body, headers, response_time)
- **Flexible Assertion Syntax**: Both flat (`body.status: "success"`) and structured syntax support
- **Performance Metrics**: Response time tracking and performance assertions
- **Multiple Output Formats**: JSON, HTML, and console reporting options
- **Verbosity Levels**: Configurable logging from silent to verbose
- **Modular Architecture**: Specialized services for HTTP, assertions, capture, variables, and flow management

### Changed
- **Architecture**: Complete rewrite with TypeScript strict mode and modular services
- **Configuration**: Enhanced YAML schema with new properties and validation
- **Execution Model**: Sequential execution with support for conditional branching

### Technical Improvements
- **Type Safety**: Full TypeScript strict mode implementation
- **Error Handling**: Comprehensive error handling with detailed logging
- **Extensibility**: Plugin architecture for custom services and assertions
- **Performance**: Optimized execution with minimal overhead

## [1.0.0] - 2023-XX-XX

### Added
- Initial release of Flow Test Engine
- Basic YAML-based test suite execution
- HTTP request/response handling
- Simple assertion system
- Basic variable interpolation
- Console output reporting

---

## Types of Changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

## Versioning Policy
This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

## Contributing to Documentation
When contributing to the documentation:
1. Update relevant sections in the appropriate `.md` files
2. Add examples for new features
3. Update the changelog with your changes
4. Test examples to ensure they work correctly

## Support
For questions about changes or documentation:
- Check the [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- Review [Best Practices](./docs/BEST_PRACTICES.md)
- See [YAML Examples](./docs/YAML_EXAMPLES.md) for usage patterns
