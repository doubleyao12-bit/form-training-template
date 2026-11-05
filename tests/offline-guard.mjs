// Loaded before every default test. Unexpected HTTP access fails rather than reaching a cloud.
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
const deny = () => { throw new Error('Network request denied by the FORM offline test guard'); };
globalThis.fetch = deny;
http.request = deny; http.get = deny;
https.request = deny; https.get = deny;
syncBuiltinESMExports();
