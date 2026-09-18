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
// Open-Meteo.com API data are offered under Attibution 4.0 International (CC BY 4.0) license.
// Please see https://open-meteo.com/en/licence for more information.

/// <reference types="@fastly/js-compute" />

import { getGeolocationForIpAddress } from "fastly:geolocation";
import { SecretStoreManager } from "./lib/config";

async function weatherHandler(req, client) {
    let apiToken = 'helloworld';
    try {
        // Serve as an example of how to use the secret store
        apiToken = await SecretStoreManager.getSecret('API_TOKEN');
    } catch (e) {
        console.warn('No API_TOKEN secret found, using default api token');
    }
    // The CDN request transformation (see config/cdn.yaml) provides the client IP as the `ip`
    // query parameter, which is part of the cache key. `client.address` is a local fallback.
    const ipParam = new URL(req.url).searchParams.get("ip");
    const clientIp = ipParam || client?.address;
    console.log(`Received request for weather data from IP: ${clientIp} (ip param: ${ipParam ?? "not set"})`);
    // NOTE: In local development (`serve` via Viceroy) IP geolocation is not backed by a real
    // geo database — it only returns stub data for 127.0.0.1 and null for arbitrary IPs (so
    // `/weather?ip=<any-public-ip>` will not resolve locally unless you configure
    // `[local_server.geolocation]` in fastly.toml). Real geolocation works when deployed.
    const locationInfo = getGeolocationForIpAddress(clientIp);
    console.log("Location Information:\n", locationInfo);
    // Geolocation can be null for IPs the geo database can't resolve (e.g. private/loopback
    // addresses, or arbitrary IPs when testing locally). Respond gracefully instead of
    // dereferencing a null location. This response is not location-specific, so allow caching.
    if (!locationInfo || locationInfo.latitude === undefined || locationInfo.longitude === undefined) {
        return new Response(`Could not determine a location for IP ${clientIp}`, {
            status: 200,
            headers: { "Cache-Control": "public, max-age=300" }
        });
    }
    const request = new Request("https://api.open-meteo.com/v1/forecast?current=temperature_2m&latitude=" + locationInfo.latitude + "&longitude=" + locationInfo.longitude);
    request.headers.set("Authorization", "Bearer " + apiToken);
    const backendResponse = await fetch(request);
    if(backendResponse.status !== 200) {
        return new Response("Error fetching weather data", { status: 500 });
    } else {
        const data = await backendResponse.json();
        console.log("Weather API Response:\n", data);
        let resp = "No weather data available";
        if(data.current?.temperature_2m) {
        resp = `It seems you are based in ${locationInfo.city} (Weather data by Open-Meteo.com - https://open-meteo.com/) where the local temperature is ${data.current.temperature_2m}°C`;
        }
        // Cacheable for 5 minutes at the CDN. Combined with the per-client `ip` cache key
        // set in config/cdn.yaml, repeat requests from the same client are served from the
        // CDN cache without re-invoking the Edge Function. (max-age is in seconds; "5m"
        // would be an invalid value and disable caching.)
        return new Response(resp, { status: 200, headers: { "Cache-Control": "public, max-age=300" } });
    }
}

export { weatherHandler };
