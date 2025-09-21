import { PostmanCollectionService, POSTMAN_SCHEMA_URL, PostmanCollection } from "../postman-collection.service";
import { TestSuite } from "../../types/engine.types";

describe("PostmanCollectionService", () => {
  const service = new PostmanCollectionService();

  it("converts a Flow suite into a Postman collection", () => {
    const suite: TestSuite = {
      suite_name: "Sample Suite",
      node_id: "sample-suite",
      description: "Suite generated for testing",
      metadata: {
        priority: "medium",
        tags: ["sample"],
      },
      base_url: "https://api.example.com",
      variables: {},
      steps: [
        {
          name: "Fetch user",
          request: {
            method: "GET",
            url: "/users",
            headers: {
              Authorization: "Bearer {{token}}",
            },
          },
          assert: {
            status_code: 200,
            body: {
              data: {
                equals: "ok",
              },
            },
          },
          capture: {
            userId: "body.data.id",
          },
        },
      ],
    };

    const collection = service.convertSuiteToCollection(suite);

    expect(collection.info.name).toBe("Sample Suite");
    expect(collection.info.schema).toBe(POSTMAN_SCHEMA_URL);
    expect(collection.item).toHaveLength(1);

    const [item] = collection.item;
    expect(item.request?.method).toBe("GET");
    expect(item.request?.url.raw).toBe("https://api.example.com/users");
    expect(item.request?.header?.[0]).toEqual({
      key: "Authorization",
      value: "Bearer {{token}}",
    });

    const scriptLines = item.event?.[0]?.script.exec || [];
    expect(scriptLines[0]).toBe("const responseJson = pm.response.json();");
    expect(scriptLines).toContain(
      "pm.test(\"Status code is 200\", function () {"
    );
    expect(scriptLines).toContain(
      "  pm.expect(pm.response.code).to.eql(200);"
    );
    expect(scriptLines).toContain(
      "pm.environment.set(\"userId\", responseJson?.data?.id);"
    );
  });

  it("converts a Postman collection into a Flow suite", () => {
    const collection: PostmanCollection = {
      info: {
        name: "Imported Collection",
        schema: POSTMAN_SCHEMA_URL,
      },
      item: [
        {
          name: "Authenticate",
          request: {
            method: "POST",
            url: {
              raw: "https://api.example.com/v1/auth",
              query: [
                { key: "limit", value: "10" },
              ],
            },
            header: [
              { key: "Content-Type", value: "application/json" },
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                username: "demo",
                password: "secret",
              }),
            },
          },
          event: [
            {
              listen: "test",
              script: {
                type: "text/javascript",
                exec: [
                  "pm.test(\"Check if response status is 200\", function () {",
                  "    pm.expect(pm.response.code).to.be.equals(200);",
                  "});",
                  "var response = pm.response.json();",
                  "pm.environment.set(\"TOKEN\", response.access_token);",
                ],
              },
            },
          ],
        },
      ],
    };

    const suite = service.convertCollectionToSuite(collection);

    expect(suite.suite_name).toBe("Imported Collection");
    expect(suite.node_id).toBe("imported-collection");
    expect(suite.base_url).toBe("https://api.example.com");
    expect(suite.steps).toHaveLength(1);

    const [step] = suite.steps;
    expect(step.request.method).toBe("POST");
    expect(step.request.url).toBe("/v1/auth");
    expect(step.request.params).toEqual({ limit: "10" });
    expect(step.request.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(step.request.body).toEqual({
      username: "demo",
      password: "secret",
    });

    expect(step.assert?.status_code).toBe(200);
    expect(step.capture?.TOKEN).toBe("body.access_token");
  });
});
