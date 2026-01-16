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

import { SecretStore } from 'fastly:secret-store';

export class SecretStoreManager {
  static instance = null;

  constructor() {
    this.secrets = null;
  }

  static getInstance() {
    if (!SecretStoreManager.instance) {
      SecretStoreManager.instance = new SecretStoreManager();
    }
    return SecretStoreManager.instance;
  }

  async getSecret(key) {
    if (!this.secrets) {
      try {
        const store = new SecretStore('secret_default');
        const secretsMap = await store.get('secrets');
        if (!secretsMap) {
          throw new Error('Secrets not found in store');
        }
        this.secrets = JSON.parse(secretsMap.plaintext());
      } catch (error) {
        console.error('Failed to load secrets:', error);
        throw error;
      }
    }
    return this.secrets[key];
  }

  static async getSecret(key) {
    const instance = SecretStoreManager.getInstance();
    return instance.getSecret(key);
  }
}
