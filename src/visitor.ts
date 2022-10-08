import {
  Document,
  IVisitor,
  Contact,
  Extension,
  ExternalDocumentation,
  Info,
  Library,
  License,
  SecurityRequirement,
  SecurityScheme,
  Tag,
  TraverserDirection,
  ValidationProblem,
  IDefinition,
  Oas30Operation,
  Oas30Parameter,
  Oas30PathItem,
  Oas30Schema,
  Oas30RequestBody,
  Oas30Response,
  Oas30SchemaDefinition,
} from "@apicurio/data-models";

function addExtensions(node: Info, object) {
  const extensions: Extension[] = node.getExtensions() || [];
  for (const extension of extensions) {
    object[extension.name] = extension.value;
  }
}

// Map of OAS path to MoonWalk pathKey.
// This memoizes the result of the function below.
const pathKeys = new Map<string, string>();

// Construct a URI template for a path item.
// This starts with the path key but then adds all query parameters
function getPathKey(node: Oas30PathItem): string {
  const oasPath = node.getPath();
  if (!pathKeys.has(oasPath)) {
    const qpsForOp = (op: Oas30Operation): string[] =>
      op.parameters?.filter((v) => v.in === "query").map((v) => v.name) || [];
    const pathOps = [
      node.get,
      node.put,
      node.post,
      node.patch,
      node.delete,
    ] as Oas30Operation[];
    const queryParams: Set<string> = new Set();
    for (const op of pathOps.filter((v) => v !== null)) {
      qpsForOp(op).forEach((name) => queryParams.add(name));
    }
    if (queryParams.size === 0) {
      pathKeys.set(oasPath, oasPath);
    } else {
      pathKeys.set(oasPath, `${oasPath}{?${[...queryParams].join(",")}}`);
    }
  }
  return pathKeys.get(oasPath);
}

// Construct a request for the operation using just the specified contentType request body
class OperationVisitor implements IVisitor {
  request: object = {};
  contentType: string;
  constructor(contentType: string) {
    this.contentType = contentType;
  }
  visitExtension(node: Extension) {
    this.request[node.name] = node.value;
  }
  visitExternalDocumentation(node: ExternalDocumentation) {
    throw new Error("Method not implemented.");
  }
  visitInfo(node: Info) {}
  visitLicense(node: License) {}
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
      tags: node.tags || undefined,
      responses: {},
    };
  }
  visitParameter(node: Oas30Parameter) {
    // We currently only handle path and query parameters
    if (["path", "query"].includes(node.in)) {
      const oasSchema = node.schema as Oas30Schema;
      this.request["parameterSchema"]["properties"][node.name] = {
        type: oasSchema.type || undefined,
        format: oasSchema.format || undefined,
        description: oasSchema.description || undefined,
      };
      if (node.required) {
        this.request["parameterSchema"]["required"] ??= [];
        this.request["parameterSchema"]["required"].push(node.name);
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
  visitRequestBody(node) {}
  visitAdditionalPropertiesSchema(node) {}
  visitHeader(node) {}
  visitItemsSchema(node) {}
  visitMediaType(node) {}
  visitResponses(node) {}
  visitSchema(node) {}
  visitSecurityRequirement(node: SecurityRequirement) {}
  // Unneeded methods
  visitContact(node: Contact) {
    throw new Error("Method not implemented.");
  }
  visitDocument(node: Document) {
    throw new Error("Method not implemented.");
  }
  visitParameterDefinition(node: IDefinition) {
    throw new Error("Method not implemented.");
  }
  visitSchemaDefinition(node: IDefinition) {
    throw new Error("Method not implemented.");
  }
  visitSecurityScheme(node: SecurityScheme) {
    throw new Error("Method not implemented.");
  }
  visitTag(node: Tag) {
    throw new Error("Method not implemented.");
  }
  visitValidationProblem(problem: ValidationProblem) {
    throw new Error("Method not implemented.");
  }
}

export default class Oas30Visitor implements IVisitor {
  document: object;
  visitAdditionalPropertiesSchema(node) {}
  visitComponents(node) {
    //throw new Error('Method not implemented.');
  }
  visitContact(node: Contact) {
    //throw new Error('Method not implemented.');
  }
  visitDocument(node: Document) {
    this.document = {
      openapi: "4.0.0",
    };
  }
  visitExtension(node: Extension) {
    //throw new Error('Method not implemented.');
  }
  visitExternalDocumentation(node: ExternalDocumentation) {
    //throw new Error('Method not implemented.');
  }
  visitHeader(node) {
    //throw new Error('Method not implemented.');
  }
  visitImplicitOAuthFlow(node) {}
  visitInfo(node: Info) {
    const info = {
      title: node.title,
      description: node.description || undefined,
      termsOfService: node.termsOfService || undefined,
      version: node.version || undefined,
    };
    if (node.contact) {
      info["contact"] = {
        name: node.contact.name || undefined,
        url: node.contact.url || undefined,
        email: node.contact.email || undefined,
      };
    }
    if (node.license) {
      info["license"] = {
        name: node.license.name,
        url: node.license.url || undefined,
      };
    }
    addExtensions(node, info);
    this.document["info"] = info;
  }
  visitItemsSchema(node) {
    //throw new Error('Method not implemented.');
  }
  visitLicense(node: License) {
    //throw new Error('Method not implemented.');
  }
  visitMediaType(node: License) {
    //throw new Error('Method not implemented.');
  }
  visitOAuthFlows(node) {}
  visitOperation(node: Oas30Operation) {
    const pathKey = getPathKey(node.parent() as Oas30PathItem);
    if (!this.document["paths"][pathKey]["requests"]) {
      this.document["paths"][pathKey]["requests"] = {};
    }
    const contentTypes =
      node.requestBody?.getMediaTypes().map((n) => n.getName()) || [];
    if (contentTypes.length <= 1) {
      const contentType = contentTypes.find(Boolean) || undefined;
      const opVisitor: OperationVisitor = new OperationVisitor(contentType);
      Library.visitTree(node, opVisitor, TraverserDirection.down);
      const requestKey = node.operationId || node.getMethod();
      this.document["paths"][pathKey]["requests"][requestKey] =
        opVisitor.request;
    } else {
      // When the request body has multiple content types we create a separate request
      // for each content type. The request name is formed by concatenating the operationId
      // (or http method if no operationId) with a sanitized content-type
      for (const contentType of contentTypes) {
        const opVisitor: OperationVisitor = new OperationVisitor(contentType);
        Library.visitTree(node, opVisitor, TraverserDirection.down);
        const requestKey =
          (node.operationId || node.getMethod()) +
          "-" +
          contentType.replace(/\W+(?!$)/g, "-").toLowerCase();
        this.document["paths"][pathKey]["requests"][requestKey] =
          opVisitor.request;
      }
    }
  }
  visitParameterDefinition(node: IDefinition) {
    //throw new Error('Method not implemented.');
  }
  // This method only needs to handle parameters at the pathItem level
  visitParameter(node: Oas30Parameter) {
    if (node.parent() instanceof Oas30PathItem) {
      if (!["path", "query"].includes(node.in)) {
        // We currently only handle path and query parameters
        return;
      }
      const pathKey = getPathKey(node.parent() as Oas30PathItem);
      if (!this.document["paths"][pathKey]["parameterSchema"]) {
        this.document["paths"][pathKey]["parameterSchema"] = {
          type: "object",
          properties: {},
        };
      }
      const oasSchema = node.schema as Oas30Schema;
      this.document["paths"][pathKey]["parameterSchema"]["properties"][
        node.name
      ] = {
        type: oasSchema.type || undefined,
        format: oasSchema.format || undefined,
        description: oasSchema.description || undefined,
      };
    }
  }
  visitPaths(node) {
    this.document["paths"] = {};
  }
  visitPathItem(node: Oas30PathItem) {
    const pathKey = getPathKey(node);
    this.document["paths"][pathKey] = {
      summary: node.summary || undefined,
      description: node.description || undefined,
    };
  }
  visitPropertySchema(node) {
    //throw new Error('Method not implemented.');
  }
  visitRequestBody(node: Oas30RequestBody) {}
  visitRequestBodyDefinition(node) {}
  visitSchemaDefinition(node: Oas30SchemaDefinition) {
    this.document["components"] ??= { schemas: {} };
    const schema = Library.writeNode(node);
    this.document["components"]["schemas"][node.getName()] = schema;
  }
  visitResponses(node) {}
  visitResponse(node: Oas30Response) {}
  visitSchema(node: Oas30Schema) {
    //throw new Error('Method not implemented.');
  }
  visitSecurityRequirement(node: SecurityRequirement) {
    //throw new Error('Method not implemented.');
  }
  visitServer(node) {
    //throw new Error('Method not implemented.');
  }
  visitSecurityScheme(node: SecurityScheme) {
    //throw new Error('Method not implemented.');
  }
  visitTag(node: Tag) {
    //throw new Error('Method not implemented.');
  }
  visitValidationProblem(problem: ValidationProblem) {
    //throw new Error('Method not implemented.');
  }
  visitXML(node) {}
}
