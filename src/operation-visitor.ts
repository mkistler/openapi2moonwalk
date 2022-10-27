import {
  CombinedVisitorAdapter,
  Extension,
  ExternalDocumentation,
  Library,
  SecurityRequirement,
  Oas30Operation,
  Oas30Parameter,
  Oas30RequestBody,
  Oas30Response,
} from "@apicurio/data-models";

// Construct a request for the operation using just the specified contentType request body
export default class OperationVisitor extends CombinedVisitorAdapter {
  request: object = {};
  contentType: string;
  constructor(contentType: string) {
    super();
    this.contentType = contentType;
  }
  visitExtension(node: Extension) {
    this.request[node.name] = node.value;
  }
  visitExternalDocumentation(node: ExternalDocumentation) {
    this.request["externalDocumentation"] = Library.writeNode(node);
  }
  visitOperation(node: Oas30Operation) {
    const parameterSchema = node.parameters?.some((p) =>
      ["path", "query"].includes(p.in)
    )
      ? {
          type: "object",
          properties: {},
        }
      : undefined;
    this.request = {
      description: node.description || undefined,
      summary: node.summary || undefined,
      method: node.getMethod(),
      parameterSchema,
      contentType: this.contentType,
      contentSchema: this.contentType ? {} : undefined,
      tags: node.tags || undefined,
      responses: {},
    };
  }

  visitParameter(node: Oas30Parameter) {
    const paramSchema = this.request["parameterSchema"];
    if (node.$ref) {
      // use allOf to pull in ref'd parameters
      paramSchema["allOf"] ??= [];
      paramSchema["allOf"].push(Library.writeNode(node));
    } else {
      paramSchema["properties"][node.name] = Library.writeNode(node.schema);
      if (node.required) {
        paramSchema["required"] ??= [];
        paramSchema["required"].push(node.name);
      }
    }
  }

  visitResponse(node: Oas30Response) {
    // Since responses must have unique status codes in Oas30, we'll create the response name
    // from the status code.
    // https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes
    const responseNameMap: Map<string, string> = new Map<string, string>([
      ["200", "OK"],
      ["201", "Created"],
      ["202", "Accepted"],
      ["204", "No Content"],
      ["400", "Bad Request"],
      ["401", "Unauthorized"],
      ["403", "Forbidden"],
      ["404", "Not Found"],
      ["405", "Method Not Allowed"],
    ]);
    const statusCode = node.getStatusCode() || "default";
    const responseNameBase = responseNameMap.get(statusCode) || statusCode;
    // Create one response for each media-type,
    const mediaTypes = node.getMediaTypes();
    if (mediaTypes.length <= 1) {
      this.request["responses"][responseNameBase] = {
        statusCode,
        description: node.description, // description is required in Oas30
      };
      if (mediaTypes.length === 1) {
        this.request["responses"][responseNameBase]["contentType"] =
          mediaTypes[0].getName();
        const schema = node.getMediaTypes()[0].schema;
        this.request["responses"][responseNameBase]["contentSchema"] =
          Library.writeNode(schema);
      }
    }
    for (const mediaType of mediaTypes) {
      const responseName =
        responseNameBase +
        "-" +
        mediaType
          .getName()
          .replace(/\W+(?!$)/g, "-")
          .toLowerCase();
      this.request["responses"][responseName] = {
        statusCode,
        description: node.description, // description is required in Oas30
        contentType: mediaType.getName(),
      };
      const schema = mediaType.schema;
      this.request["responses"][responseName]["contentSchema"] =
        Library.writeNode(schema);
    }
  }
  visitRequestBody(node: Oas30RequestBody) {
    const contentSchema = node.content[this.contentType]?.schema;
    this.request["contentSchema"] = Library.writeNode(contentSchema);
  }
  visitSecurityRequirement(node: SecurityRequirement) {
    this.request["security"] = Library.writeNode(node);
  }
  visitHeader() {
    // TODO: determine how to handle header parameters
  }
  visitMediaType() {
    // mediaTypes of requestBody are handled in visitRequestBody
    // mediaTypes of response are handled in visitResponse
  }
  visitResponses() {
    // responses are handled individually in visitResponse
  }
}
