import { debug, getInput, info } from "@actions/core";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import { platform, arch } from "process";

const TMP_PREFIX = "/tmp/nix-cache-action-";

function system(cmd: string): Promise<number> {
  const argv = cmd.split(" ");
  const child = spawn(argv[0], argv.slice(1));

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code !== null) resolve(code);
      else reject(new Error(`command ${cmd} didn't exit correctly`));
    });
  });
}

interface GenerateInput {
  substituters: string[];
  trustedPublicKeys: string[];
  secretKeys: string[];
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
}

interface GenerateResults {
  config: string;
  credsPath: string;
}

async function setupAwsCreds(
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
): Promise<string> {
  const credsPath = `${TMP_PREFIX}aws-credentials`;
  const credsFileContent = `[default]\naws_access_key_id = ${awsAccessKeyId}\naws_secret_access_key = ${awsSecretAccessKey}\n`;
  await writeFile(credsPath, credsFileContent, { mode: 0o600 });
  debug(`Wrote ${credsPath}`);

  const rootFolder = platform === "darwin" ? "/var/root/.aws" : "/root/.aws";
  await system(`sudo mkdir -p ${rootFolder}`);
  await system(`sudo cp ${credsPath} ${rootFolder}/credentials`);

  await system(`mkdir -p $HOME/.aws`);
  await system(`sudo cp ${credsPath} $HOME/.aws/credentials`);

  return credsPath;
}

async function setupPostBuildHook(
  credsPath: string,
  cache: string,
): Promise<string> {
  const fname = `${TMP_PREFIX}post-build-hook`;
  const hook = `#!/bin/bash
set -euo pipefail
echo "Uploading paths: $OUT_PATHS" 1>&2
export AWS_SHARED_CREDENTIALS_FILE='${credsPath}'

echo "$OUT_PATHS" | xargs /nix/var/nix/profiles/default/bin/nix \\
  --extra-experimental-features nix-command \\
  copy --to '${cache}' 1>&2
`;
  await writeFile(fname, hook, { mode: 0o755 });
  return fname;
}

async function setupSecretKeys(secretKeys: string[]): Promise<string[]> {
  return await Promise.all(
    secretKeys.map((k, i) =>
      (async () => {
        const fname = `${TMP_PREFIX}-secret-key-${i}`;
        await writeFile(fname, k, { mode: 0o600 });
        debug(`Wrote ${fname}`);
        return fname;
      })(),
    ),
  );
}

async function generate(input: GenerateInput): Promise<GenerateResults> {
  const {
    substituters,
    trustedPublicKeys,
    secretKeys,
    awsAccessKeyId,
    awsSecretAccessKey,
  } = input;

  const credsPath = await setupAwsCreds(awsAccessKeyId, awsSecretAccessKey);
  const hookPath = await setupPostBuildHook(credsPath, substituters[0]);
  const secretKeyFiles = await setupSecretKeys(secretKeys);

  const config = `extra-substituters = ${substituters.join(" ")}
extra-trusted-public-keys = ${trustedPublicKeys.join(" ")}
extra-secret-key-files = ${secretKeyFiles.join(" ")}
post-build-hook = ${hookPath}\n
`;

  return { credsPath, config };
}

function getInputListRequired(name: string): string[] {
  return getInput(name, { required: true }).trim().split(" ");
}

async function run(): Promise<void> {
  info("Generating configuration...");

  const { config: newConfig, credsPath } = await generate({
    substituters: getInputListRequired("substituters"),
    trustedPublicKeys: getInputListRequired("trusted_public_keys"),
    secretKeys: getInputListRequired("secret_keys"),
    awsAccessKeyId: getInput("aws_access_key_id", { required: true }),
    awsSecretAccessKey: getInput("aws_secret_access_key", { required: true }),
  });

  info("Saving configuration...");
  const configFName = `${TMP_PREFIX}nix-config`;
  await writeFile(configFName, newConfig);
  await system("sudo mkdir -p /etc/nix");
  await system(`sudo cat ${configFName} >> /etc/nix/nix.conf`);

  info("Restarting nix daemon...");
  if (platform === "linux")
    await system("sudo systemctl restart nix-daemon.service");
  else if (platform === "darwin")
    await system("sudo launchctl kickstart -k system/org.nixos.nix-daemon");

  info("Done!");
}

async function cleanup(): Promise<void> {
  info("Removing temporary files...");
  await system(`sudo rm -rf ${TMP_PREFIX}*`);
}

if (process.env.STATE_isCleanup === "true") cleanup();
else run();
