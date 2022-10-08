import {
  IVisitor,
  Extension,
  Library,
  Server,
  Tag,
  TraverserDirection,
  Oas30Document,
  Oas30Operation,
  Oas30Parameter,
  Oas30PathItem,
  Oas30RequestBodyDefinition,
  Oas30SchemaDefinition,
  Oas30SecurityScheme,
} from "@apicurio/data-models";
import OperationVisitor from "./operation-visitor.js";

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

export default class Oas30Visitor implements IVisitor {
  document: object;
  visitDocument(node: Oas30Document) {
    this.document = {
      openapi: "4.0.0",
      info: Library.writeNode(node.info),
      externalDocs: node.externalDocs
        ? Library.writeNode(node.externalDocs)
        : undefined,
      servers: node.servers ? [] : undefined,
      tags: node.tags ? [] : undefined,
    };
    const extensions: Extension[] = node.getExtensions() || [];
    for (const extension of extensions) {
      this.document[extension.name] = extension.value;
    }
    this.document["paths"] = node.paths ? {} : undefined;
    this.document["components"] = node.components ? {} : undefined;
  }

  // Info Object
  visitInfo() {
    // info is handled in visitDocument
  }
  visitContact() {
    // info.contact is handled in visitDocument
  }
  visitLicense() {
    // info.license is handled in visitDocument
  }

  // Server Object
  visitServer(node: Server) {
    this.document["servers"].push(Library.writeNode(node));
  }

  // Tag
  visitTag(node: Tag) {
    this.document["tags"].push(Library.writeNode(node));
  }

  visitExternalDocumentation() {
    // externalDocs for document is handled in visitDocument
    // externalDocs for tag is handled in visitTag
    // externalDocs for operation is handled in VisitOperation
  }
  visitExtension() {
    // all extensions and handled within their parent
  }
  visitHeader() {
    // TODO
  }
  visitImplicitOAuthFlow() {
    // TODO
  }
  visitOAuthFlows() {
    // TODO
  }

  visitItemsSchema() {
    // items Schema handled in visitSchema
  }

  visitMediaType() {
    // mediaTypes handled in VisitOperation
  }

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

  // This method only needs to handle parameters at the pathItem level
  visitParameter(node: Oas30Parameter) {
    if (node.parent() instanceof Oas30PathItem) {
      const pathKey = getPathKey(node.parent() as Oas30PathItem);
      const paramSchema = this.document["paths"][pathKey]["parameterSchema"];
      if (node.$ref) {
        // use allOf to pull in ref'd parameters
        paramSchema["allOf"] ??= [];
        paramSchema["allOf"].push(Library.writeNode(node));
      } else {
        paramSchema["properties"] ??= {};
        paramSchema["properties"][node.name] = Library.writeNode(node.schema);
        if (node.required) {
          paramSchema["required"] ??= [];
          paramSchema["required"].push(node.name);
        }
      }
    }
  }
  visitPaths() {
    // paths are handled in visitDocument
  }
  visitPathItem(node: Oas30PathItem) {
    const pathKey = getPathKey(node);
    this.document["paths"][pathKey] = {
      summary: node.summary || undefined,
      description: node.description || undefined,
      parameterSchema: node.parameters
        ? {
            type: "object",
          }
        : undefined,
    };
  }
  visitPropertySchema() {
    // property schema are handled in visitSchema
  }
  visitRequestBody() {
    // handled in VisitOperation
  }

  // Components
  visitComponents() {
    // components is handled in visitDocument
  }
  visitSchemaDefinition(node: Oas30SchemaDefinition) {
    this.document["components"]["schemas"] ??= {};
    this.document["components"]["schemas"][node.getName()] =
      Library.writeNode(node);
  }
  visitParameterDefinition(node: Oas30Parameter) {
    const paramSchema = {
      type: "object",
      properties: {},
    };
    paramSchema["properties"][node.name] = Library.writeNode(node.schema);
    paramSchema["required"] = node.required ? [node.name] : undefined;
    this.document["components"]["parameters"] ??= {};
    this.document["components"]["parameters"][node.getName()] = paramSchema;
  }
  visitRequestBodyDefinition(node: Oas30RequestBodyDefinition) {
    this.document["components"]["requestBodies"] ??= {};
    this.document["components"]["requestBodies"][node.getName()] =
      Library.writeNode(node);
  }
  visitSecurityScheme(node: Oas30SecurityScheme) {
    this.document["components"]["securitySchemes"] ??= {};
    this.document["components"]["securitySchemes"][node.getName()] =
      Library.writeNode(node);
  }
  visitAdditionalPropertiesSchema() {
    // additionalProperties schema are handled in visitSchema
  }
  visitResponses() {
    // responses handled by VisitOperation
  }
  visitResponse() {
    // responses handled by VisitOperation
  }
  visitSchema() {
    //throw new Error('Method not implemented.');
  }
  visitSecurityRequirement() {
    //throw new Error('Method not implemented.');
  }
  visitValidationProblem() {
    //throw new Error('Method not implemented.');
  }
  visitXML() {
    // Xml handled in visitSchema
  }
}
