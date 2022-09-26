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
  Oas30PathItem,
  OasOperation,
  Oas30Parameter,
  OasPathItem,
  Oas30Schema,
} from "@apicurio/data-models";
import { notEqual } from "assert";

function addExtensions(node: Info, object) {
  const extensions: Extension[] = node.getExtensions();
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

export default class MyCustomVisitor implements IVisitor {
  document: object;
  currentOperation: object;
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
  visitOperation(node: OasOperation) {
    const pathKey = getPathKey(node.parent() as OasPathItem);
    if (!this.document["paths"][pathKey]["requests"]) {
      this.document["paths"][pathKey]["requests"] = {};
    }
    const requestKey = node.operationId || node.getMethod();
    this.document["paths"][pathKey]["requests"][requestKey] = {
      method: node.getMethod(),
    };
    this.currentOperation =
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
    if (this.currentOperation) {
      if (!this.currentOperation["parameterSchema"]) {
        this.currentOperation["parameterSchema"] = {
          type: "object",
          properties: {},
        };
      }
    }
    const oasSchema = node.schema as Oas30Schema;
    this.currentOperation["parameterSchema"]["properties"][node.name] = {
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
    this.currentOperation = undefined;
  }
  visitPropertySchema(node) {
    //throw new Error('Method not implemented.');
  }
  visitRequestBody(node) {}
  visitSchemaDefinition(node: IDefinition) {
    //throw new Error('Method not implemented.');
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
  visitResponses(node) {
    //throw new Error('Method not implemented.');
  }
  visitResponse(node) {
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
}
