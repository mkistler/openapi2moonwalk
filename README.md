# openapi2moonwalk

Convert OpenAPI v3.0.x to MoonWalk.

## Prereqs

Node & npm, version 14 or later

## Installation

Clone the repo and from the root directory install and build.

```
npm install
npm run build
```

## Usage

```
node dist/app.js [oasv3-file]
```

The converted moonwalk file is written to stdout

## Example

Download the petstore OASv3 API definition from swagger.io and convert to moonwalk.

```
curl --output petstore.v3.json https://petstore3.swagger.io/api/v3/openapi.json
node ./dist/app.js petstore.v3.json | less
```
