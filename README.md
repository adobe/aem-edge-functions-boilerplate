# aem-edge-functions-boilerplate

## Introduction

This boilerplate serves as an example of what is possible to achieve with AEM Edge Functions. The repository contains a simple server that expose multiple endpoints and makes usage of:

- Edge Functions service provisioning
- Configurations usage (ConfigStore)
- Secrets usage (SecretStore)
- Logging
- Log Tailing

Functions source code can be found under `./src`, tests can be found under `./test` and are executable through `mocha`.
The service configuration is defined in `config/compute.yaml` and CDN routing in `config/cdn.yaml`.

## Setup

### Adobe CLI

First install Adobe CLI (aio) with the following command

```
npm install -g @adobe/aio-cli
```

Next install the aio-cli AEM Edge Functions plugin

```
aio plugins:install @adobe/aio-cli-plugin-aem-edge-functions
```

Finally run the following commands to finish setting up the aio AEM Edge Functions plugin.

```
aio login
aio aem edge-functions setup
```

This command will ask you to login and then to select your environment on which you want to use AEM Edge Functions.

Note: You will need to have the **AEM Administrator Product Profile** in order to be able to deploy code to your edge functions

### Boilerplate

Run the following command from the boilerplate project to setup your machine

```
npm install
```

## Create your edge functions

The first step to create your edge functions is to ensure that you have setup a configuration pipeline for your environment in Cloud Manager. If it is not the case, please follow this [documentation](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/operations/config-pipeline) to create your configuration pipeline.

In case you are using a RDE, you can deploy your configuration using the command `aio aem:rde:install -t env-config ./config`.

Edge Functions creation is done via configuration file, you will need to create a YAML file (eg. compute.yaml) with the following configuration:

```
kind: "Compute"
version: "1"
data:
  services:
    - name: first-compute
    - name: second-compute
  # Uncomment to enable secrets
  # secrets:
  #   - key: API_TOKEN
  #     value: ${{ API_TOKEN_SECRET }}
```

The configuration is composed of:

- **services**: contains a list of edge functions, where a function is composed of a **name** and a set of **origins**. The number of functions is limited to 3.
- **configs**: contains a key/value configs arrays that will be exposed to all your edge functions
- **secrets**: contains a key/value secrets arrays that will be exposed to all your edge functions

Additionally, you will need to define routing rules in your CDN configuration file (eg. cdn.yaml) using CDN origin selectors rules:

```
kind: 'CDN'
version: '1'
data:
  originSelectors:
    rules:
      - name: route-to-first-compute
        when: { reqProperty: path, equals: "/weather" }
        action:
          type: selectAemOrigin
          originName: compute-first-compute
      - name: route-to-second-compute
        when: { reqProperty: path, equals: "/hello-world" }
        action:
          type: selectAemOrigin
          originName: compute-second-compute
```

**Note**: If you already have a CDN configuration file, just add the 2 origin selectors rules to your existing configuration

The origin selector rule enables you to route your traffic to your edge functions under your own conditions (such as routing a specific domain or only under a certain path). See [official documentation](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/content-delivery/cdn-configuring-traffic#origin-selectors) to learn more about Origin Selector.

Once you have created your configuration, you will need to commit your changes to your Git Repository and trigger the configuration pipeline. Once the configuration pipeline succeed, you should be able to access both your compute services:

- *publish-pXXXXX-eYYYYY.adobeaemcloud.com/weather* or *example.com/weather*
- *publish-pXXXXX-eYYYYY.adobeaemcloud.com/hello-world* or *example.com/hello-world*

where **pXXXXX-eYYYYY** is your environment coordinates.

## Build

The following command will package your compute code for deployment to your compute service.

```
aio aem edge-functions build
```

## Deploy

The following command will deploy your package to your edge function. You will have to set the argument function-name to the name you gave your function in the compute configuration file.

```
aio aem edge-functions deploy <function-name>
```

## Local run

The following command will run your compute code locally and exposed a server at `http://127.0.0.1:7676`

```
aio aem edge-functions serve
```

You can learn more about what is supported by Local runtime on [Fastly documentation](https://www.fastly.com/documentation/reference/cli/compute/serve/).

## Test

The following command will execute tests using `mocha`.

```
npm run test
```

## Remote debugging

Adobe Managed CDN only offers remote logging as a way to debug your program. The following command will tail your edge function standard output. You will be able to get runtime console.log from your edge function  directly in your terminal. You will have to set the argument function-name to the name you gave your function in the compute configuration file.

```
aio aem edge-functions tail-logs <function-name>
```

## Configuration

### Origins

Adobe Managed CDN allows compute to access any origins by default. In case you want to restrict access to only defined origins (see [Fastly Documentation](https://js-compute-reference-docs.edgecompute.app/docs/fastly:backend/enforceExplicitBackends)), you will need to define your origins in your edge functions definition (in the compute configuration file) as an array of origins similar to the [CDN Origin Selectors feature](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/content-delivery/cdn-configuring-traffic#origin-selectors).

Given the following configuration

```
origins:
  - name: my-origin-name
    domain: example.com
```

you will be able to select the origin to use for your request as follow

```
const request = new Request("https://example.com/test");
const response = await fetch(request, { backend: "my-origin-name" });
```

### Edge Function Environment Configuration

Adobe Managed CDN allows you to use environment variable in your code through config store. Those environment variables can be defined in the edge functions configuration file under configs as an array of objects containing a key and a value fields.

Given the following configuration

```
configs:
  - key: LOG_LEVEL
    value: DEBUG
```

you will be able to get your environment variable as follow

```
import { ConfigStore } from "fastly:config-store";
...
const config = new ConfigStore('config_default');
const logLevel = config.get('LOG_LEVEL') || 'info';
```

**Notes:**
- The config store will always be named config_default
- key name are case-sensitive
- The config store is shared between all your edge functions

### Edge Function Secrets

Adobe Managed CDN allows you to use secrets in your code through secret store. Those secrets can be defined in the edge functions configuration file under secrets as an array of objects containing a key and a value fields. Note that the value field **does not** contain the secret, but a reference to the secret (${{SECRET_REFERENCE}}). The secret needs to be defined in Cloud Manager as described in this [documentation](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/operations/config-pipeline#secret-env-vars).

Given the following configuration

```
secrets:
  - key: API_TOKEN
    value: ${{ API_TOKEN_SECRET }}
```

you will be able to get your secret using the secret manager class available in the boilerplate. Secrets get be retrieved as follow

```
import { SecretStoreManager } from "./lib/config";
...
const apiToken = await SecretStoreManager.getSecret('API_TOKEN');
```

**Notes:**
- The secret store will always be named secret_default
- key name are case-sensitive
- **Secrets are immutable**
- The secret store is shared between all your edge functions

### Logging

AEM Edge Functions is compatible with the [log forwarding feature](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/log-forwarding).

You can define your logging configuration as follow (create a logForwarding.yaml file next to the compute.yaml)

```
kind: "LogForwarding"
version: "1"
data:
  splunk:
    default:
      enabled: true
      host: "splunk-host.example.com"
      token: "${{SPLUNK_TOKEN}}"
      index: "AEMaaCS"
```

and use the logger in your code as follow:

```
import { Logger } from "fastly:logger";
...
const logger = new Logger("customerSplunk");
logger.log(JSON.stringify({
  method: event.request.method,
  url: event.request.url
}));
```

## References

https://www.fastly.com/documentation/guides/compute/
