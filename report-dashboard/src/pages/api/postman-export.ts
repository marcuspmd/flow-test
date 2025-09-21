import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";
import { PostmanCollectionService } from "../../../../src/services/postman-collection.service";

const workspaceRoot = path.resolve(process.cwd(), "..");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const fileParam = url.searchParams.get("file");

  if (!fileParam) {
    return jsonResponse({ error: "Missing 'file' query parameter" }, 400);
  }

  const suitePath = path.resolve(workspaceRoot, fileParam);

  if (!suitePath.startsWith(workspaceRoot)) {
    return jsonResponse({ error: "Invalid path" }, 400);
  }

  if (!fs.existsSync(suitePath)) {
    return jsonResponse({ error: "Suite file not found" }, 404);
  }

  try {
    const service = new PostmanCollectionService();
    const collection = service.convertSuiteFileToCollection(suitePath, {
      collectionName: path.basename(suitePath, path.extname(suitePath)),
    });

    const fileName = `${path
      .basename(suitePath, path.extname(suitePath))
      .replace(/[^a-zA-Z0-9_-]/g, "-")}.postman_collection.json`;
    const payload = JSON.stringify(collection, null, 2);

    return new Response(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[API:postman-export]", error);
    return jsonResponse({ error: "Failed to export suite" }, 500);
  }
};
