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
  Schema,
  SecurityRequirement,
  SecurityScheme,
  Tag,
  ValidationProblem,
  IDefinition,
} from "@apicurio/data-models";

function addExtensions(node: Info, object) {
  const extensions: Extension[] = node.getExtensions();
  for (const extension of extensions) {
    object[extension.name] = extension.value;
  }
}

export default class MyCustomVisitor implements IVisitor {
  document: object;
  visitComponents(node) {
    //throw new Error("Method not implemented.");
  }
  visitContact(node: Contact) {
    //throw new Error("Method not implemented.");
  }
  visitDocument(node: Document) {
    this.document = {};
  }
  visitExtension(node: Extension) {
    //throw new Error("Method not implemented.");
  }
  visitExternalDocumentation(node: ExternalDocumentation) {
    //throw new Error("Method not implemented.");
  }
  visitHeader(node) {
    //throw new Error("Method not implemented.");
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
    //throw new Error("Method not implemented.");
  }
  visitLicense(node: License) {
    //throw new Error("Method not implemented.");
  }
  visitMediaType(node: License) {
    //throw new Error("Method not implemented.");
  }
  visitOperation(node: Operation) {
    //throw new Error("Method not implemented.");
  }
  visitParameterDefinition(node: IDefinition) {
    //throw new Error("Method not implemented.");
  }
  visitParameter(node: Parameter) {
    //throw new Error("Method not implemented.");
  }
  visitPaths(node) {
    //throw new Error("Method not implemented.");
  }
  visitPathItem(node) {
    //throw new Error("Method not implemented.");
  }
  visitPropertySchema(node) {
    //throw new Error("Method not implemented.");
  }
  visitSchemaDefinition(node: IDefinition) {
    //throw new Error("Method not implemented.");
  }
  visitSchema(node: Schema) {
    //throw new Error("Method not implemented.");
  }
  visitSecurityRequirement(node: SecurityRequirement) {
    //throw new Error("Method not implemented.");
  }
  visitServer(node) {
    //throw new Error("Method not implemented.");
  }
  visitResponses(node) {
    //throw new Error("Method not implemented.");
  }
  visitResponse(node) {
    //throw new Error("Method not implemented.");
  }
  visitSecurityScheme(node: SecurityScheme) {
    //throw new Error("Method not implemented.");
  }
  visitTag(node: Tag) {
    //throw new Error("Method not implemented.");
  }
  visitValidationProblem(problem: ValidationProblem) {
    //throw new Error("Method not implemented.");
  }
}
