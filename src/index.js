/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/// <reference types="@fastly/js-compute" />

import { Router } from "@fastly/expressly";

import * as response from './lib/response.js';
import { log } from './lib/log.js';
import { weatherHandler } from "./weather.js";

const router = new Router();

router.use((req, res) => {
  res.on("finish", (finalResponse) => {
    log(req, finalResponse);
  });
});

router.use((err, req, res) => {
  if (err.status === 404) {
    res.send(response.notFound());
  } else if (err) {
    console.log(err);
    res.send(response.error());
  }
});

router.get("/", async (req, res) => {
  return res.send(new Response("Hello World from the edge!", { status: 200 }));
});

router.get("/hello-world", async (req, res) => {
  return res.send(new Response("Hello World from the edge!", { status: 200 }));
});

router.get("/weather", async (req, res) => {
  return res.send(await weatherHandler(req));
});

router.listen();
