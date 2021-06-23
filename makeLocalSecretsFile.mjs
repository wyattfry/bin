#!/usr/bin/env node

// Get keys from a dotnet core style appsettings file
// look each up in Azure Key Vault, get secrets and
// and save in a new file, appsettings.Local.json
// e.g. $ makeLocalSecretsFile.mjs ./appsettings.json

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const appsettingsfilepath = process.argv[2];

const vaultname = process.env['DEFAULT_KEY_VAULT'];
if (!vaultname) {
  console.error('Environment variable DEFAULT_KEY_VAULT not set!')
  process.exit(1);
}

const settings = JSON.parse(
  readFileSync(process.cwd() + "/" + appsettingsfilepath)
);

const getCommand = (key) =>
  `az keyvault secret show --vault-name ${vaultname} -o tsv --query value --name ${key} 2>/dev/null`;

Object.keys(settings).forEach((x) => {
  if (typeof settings[x] == "object") {
    Object.keys(settings[x]).forEach((i) => {
      try {
        let secretName = x + "--" + i;
        let secretValue = execSync(getCommand(secretName));
        settings[x][i] = secretValue.toString().replace(/\n$/, "");
        console.log("Found secret for key: " + secretName);
      } catch (error) {
        console.log("No secret found for key: " + secretName);
      }
    });
  } else {
    try {
      let secretValue = execSync(getCommand(x));
      settings[x] = secretValue.toString().replace(/\n$/, "");
      console.log("Found secret for key: " + x);
    } catch (error) {
      console.log("No secret found for key: " + x);
    }
  }
});

const localsettingsfilepath = appsettingsfilepath.replace(
  /(^.*appsettings)(\.[a-zA-Z\.]+)?(.json$)/,
  "$1.Local$3"
);
const fulloutputpath = process.cwd() + "/" + localsettingsfilepath;

console.log("Writing to " + fulloutputpath);

writeFileSync(fulloutputpath, JSON.stringify(settings, null, 2));

console.log("Done.");
