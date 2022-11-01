import "https://deno.land/std@0.157.0/dotenv/load.ts";
import { CNDIContext } from "../types.ts";
import { padPrivatePem, padPublicPem } from "../utils.ts";

/**
 * COMMAND fn: cndi run
 * Creates a CNDI cluster by reading the contents of ./cndi
 */
const runFn = async ({
  pathToTerraformBinary,
  pathToTerraformResources,
}: CNDIContext) => {
  console.log("cndi run");
  try {
    const git_username = Deno.env.get("GIT_USERNAME");
    if (!git_username) {
      console.error("GIT_USERNAME env var is not set");
      Deno.exit(31);
    }

    const git_password = Deno.env.get("GIT_PASSWORD");
    if (!git_password) {
      console.error("GIT_PASSWORD env var is not set");
      Deno.exit(32);
    }

    const git_repo = Deno.env.get("GIT_REPO");
    if (!git_repo) {
      console.error("GIT_REPO env var is not set");
      Deno.exit(33);
    }

    const argoui_readonly_password = Deno.env.get("ARGOUI_READONLY_PASSWORD");
    if (!argoui_readonly_password) {
      console.error("ARGOUI_READONLY_PASSWORD env var is not set");
      Deno.exit(34);
    }

    const sealed_secrets_private_key_material = Deno.env.get(
      "SEALED_SECRETS_PRIVATE_KEY_MATERIAL",
    )?.trim().replaceAll("_", "\n");

    if (!sealed_secrets_private_key_material) {
      console.error("SEALED_SECRETS_PRIVATE_KEY_MATERIAL env var is not set");
      Deno.exit(35);
    }

    const sealed_secrets_public_key_material = Deno.env.get(
      "SEALED_SECRETS_PUBLIC_KEY_MATERIAL",
    )?.trim().replaceAll("_", "\n");
    if (!sealed_secrets_public_key_material) {
      console.error("SEALED_SECRETS_PUBLIC_KEY_MATERIAL env var is not set");
      Deno.exit(36);
    }

    const sealed_secrets_private_key = padPrivatePem(
      sealed_secrets_private_key_material,
    );
    const sealed_secrets_public_key = padPublicPem(
      sealed_secrets_public_key_material,
    );

    Deno.env.set("TF_VAR_git_username", git_username);
    Deno.env.set("TF_VAR_git_password", git_password);
    Deno.env.set("TF_VAR_git_repo", git_repo);
    Deno.env.set("TF_VAR_argoui_readonly_password", argoui_readonly_password);
    Deno.env.set(
      "TF_VAR_sealed_secrets_public_key",
      sealed_secrets_public_key,
    );
    Deno.env.set(
      "TF_VAR_sealed_secrets_private_key",
      sealed_secrets_private_key,
    );

    // terraform.tfstate will be in this folder after the first run
    const ranTerraformInit = await Deno.run({
      cmd: [
        pathToTerraformBinary,
        `-chdir=${pathToTerraformResources}`,
        "init",
      ],
      "stderr": "piped",
      "stdout": "piped",
    });

    const initStatus = await ranTerraformInit.status();
    const initOutput = await ranTerraformInit.output();
    const initStderr = await ranTerraformInit.stderrOutput();

    if (initStatus.code !== 0) {
      Deno.stdout.write(initStderr);
      Deno.exit(251); // arbitrary exit code
    } else {
      Deno.stdout.write(initOutput);
    }

    ranTerraformInit.close();

    const ranTerraformApply = await Deno.run({
      cmd: [
        pathToTerraformBinary,
        `-chdir=${pathToTerraformResources}`,
        "apply",
        "-auto-approve",
      ],
      "stderr": "piped",
      "stdout": "piped",
    });

    const applyStatus = await ranTerraformApply.status();
    const applyOutput = await ranTerraformApply.output();
    const applyStderr = await ranTerraformApply.stderrOutput();

    if (applyStatus.code !== 0) {
      Deno.stdout.write(applyStderr);
      Deno.exit(252); // arbitrary exit code
    } else {
      Deno.stdout.write(applyOutput);
    }

    ranTerraformApply.close();
  } catch (err) {
    console.log('error in "cndi run"');
    console.error(err);
  }
};

export default runFn;
