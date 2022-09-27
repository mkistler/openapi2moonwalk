import {
  Document,
  IVisitor,
  Contact,
  Extension,
  ExternalDocumentation,
  Info,
  License,
  Operation,
  Parameter,
  SecurityRequirement,
  SecurityScheme,
  Tag,
  ValidationProblem,
  IDefinition,
  Oas30MediaType,
  Oas30PathItem,
  OasOperation,
  Oas30Parameter,
  OasPathItem,
  Oas30Schema,
  Oas30RequestBody,
  Oas30Response,
} from "@apicurio/data-models";
import { notEqual } from "assert";
import { Console } from "console";

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
function getPathKey(node: OasPathItem): string {
  const oasPath = node.getPath();
  if (!pathKeys.has(oasPath)) {
    const qpsForOp = (op: OasOperation): string[] =>
      op.parameters?.filter((v) => v.in === "query").map((v) => v.name) || [];
    const pathOps = [node.get, node.put, node.post, node.patch, node.delete];
    var queryParams: Set<string> = new Set();
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

export default class Oas30Visitor implements IVisitor {
  document: object;
  currentRequest: object;
  visitAdditionalPropertiesSchema(node) {}
  visitComponents(node) {
    //throw new Error('Method not implemented.');
  }
  visitContact(node: Contact) {
    //throw new Error('Method not implemented.');
  }
  visitDocument(node: Document) {
    this.document = {};
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
  visitOperation(node: OasOperation) {
    const pathKey = getPathKey(node.parent() as OasPathItem);
    if (!this.document["paths"][pathKey]["requests"]) {
      this.document["paths"][pathKey]["requests"] = {};
    }
    const requestKey = node.operationId || node.getMethod();
    this.document["paths"][pathKey]["requests"][requestKey] = {
      description: node.description || undefined,
      summary: node.summary || undefined,
      method: node.getMethod(),
      tags: node.tags || undefined,
      responses: {},
    };
    this.currentRequest =
      this.document["paths"][pathKey]["requests"][requestKey];
    //throw new Error('Method not implemented.');
  }
  visitParameterDefinition(node: IDefinition) {
    //throw new Error('Method not implemented.');
  }
  visitParameter(node: Oas30Parameter) {
    if (!["path", "query"].includes(node.in)) {
      // We currently only handle path and query parameters
      return;
    }
    if (this.currentRequest) {
      if (!this.currentRequest["parameterSchema"]) {
        this.currentRequest["parameterSchema"] = {
          type: "object",
          properties: {},
        };
      }
    }
    const oasSchema = node.schema as Oas30Schema;
    this.currentRequest["parameterSchema"]["properties"][node.name] = {
      type: oasSchema.type || undefined,
      format: oasSchema.format || undefined,
      description: oasSchema.description || undefined,
    };
    //throw new Error('Method not implemented.');
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
    this.currentRequest = undefined;
  }
  visitPropertySchema(node) {
    //throw new Error('Method not implemented.');
  }
  visitRequestBody(node: Oas30RequestBody) {
    if (this.currentRequest) {
      const mediaTypes = node.getMediaTypes().map((n) => n.getName());
      if (mediaTypes.length > 1) {
        console.log(
          "MoonWalk does not yet handle request bodies with multiple content types"
        );
      }
      this.currentRequest["contentType"] = mediaTypes[0];
    }
  }
  visitRequestBodyDefinition(node) {}
  visitSchemaDefinition(node: IDefinition) {
    //throw new Error('Method not implemented.');
  }
  visitResponses(node) {}
  visitResponse(node: Oas30Response) {
    if (this.currentRequest) {
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
      const mediaTypes = node.getMediaTypes().map((n) => n.getName());
      if (mediaTypes.length <= 1) {
        this.currentRequest["responses"][responseNameBase] = {
          statusCode,
          description: node.description, // description is required in Oas30
        };
        if (mediaTypes.length === 1) {
          this.currentRequest["responses"][responseNameBase]["contentType"] =
            mediaTypes[0];
        }
      }
      for (const contentType of mediaTypes) {
        const responseName =
          responseNameBase +
          "-" +
          contentType.replace(/\W+(?!$)/g, "-").toLowerCase();
        this.currentRequest["responses"][responseName] = {
          statusCode,
          description: node.description, // description is required in Oas30
          contentType,
        };
      }
    }
  }
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
