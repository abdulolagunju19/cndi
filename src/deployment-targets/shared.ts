import { ccolors, Input, Secret } from "deps";
import {
  DEPLOYMENT_TARGET,
  DeploymentTarget,
  EnvLines,
  SealedSecretsKeys,
} from "src/types.ts";

import { getAWSEnvLines } from "src/deployment-targets/aws.ts";
import { getGCPEnvLines } from "src/deployment-targets/gcp.ts";
import { getAzureEnvLines } from "src/deployment-targets/azure.ts";
import { emitExitEvent } from "src/utils.ts";

const deploymentTargetsSharedLabel = ccolors.faded(
  "\nsrc/deployment-targets/shared.ts:",
);

interface CNDIGeneratedValues {
  sealedSecretsKeys: SealedSecretsKeys;
  terraformStatePassphrase: string;
  argoUIAdminPassword: string;
}

const getCoreEnvLines = async (
  cndiGeneratedValues: CNDIGeneratedValues,
  deploymentTarget: DeploymentTarget,
  interactive: boolean,
): Promise<EnvLines> => {
  const {
    sealedSecretsKeys,
    terraformStatePassphrase,
    argoUIAdminPassword,
  } = cndiGeneratedValues;

  // git
  let GIT_USERNAME = "";
  let GIT_REPO = "";
  let GIT_PASSWORD = "";

  GIT_USERNAME = interactive
    ? await Input.prompt({
      message: ccolors.prompt("Enter your GitHub username:"),
      default: GIT_USERNAME,
    })
    : GIT_USERNAME;

  GIT_PASSWORD = interactive
    ? await Secret.prompt({
      message: ccolors.prompt("Enter your GitHub Personal Access Token:"),
      default: GIT_PASSWORD,
    })
    : GIT_PASSWORD;

  GIT_REPO = interactive
    ? await Input.prompt({
      message: ccolors.prompt("Enter your GitHub repository URL:"),
      default: GIT_REPO,
    })
    : GIT_REPO;

  const TERRAFORM_STATE_PASSPHRASE = terraformStatePassphrase;
  const ARGOCD_ADMIN_PASSWORD = argoUIAdminPassword;

  if (!ARGOCD_ADMIN_PASSWORD) {
    console.log(
      deploymentTargetsSharedLabel,
      ccolors.key_name(`"ARGOCD_ADMIN_PASSWORD"`),
      ccolors.error(`is not set in environment`),
    );
    await emitExitEvent(603);
    Deno.exit(603);
  }

  if (!sealedSecretsKeys) {
    console.log(
      ccolors.key_name(`"SEALED_SECRETS_PUBLIC_KEY"`),
      ccolors.error(`and/or`),
      ccolors.key_name(`"SEALED_SECRETS_PRIVATE_KEY"`),
      ccolors.error(`are not present in environment`),
    );
    await emitExitEvent(604);
    Deno.exit(604);
  }

  if (!TERRAFORM_STATE_PASSPHRASE) {
    console.log(
      deploymentTargetsSharedLabel,
      ccolors.key_name(`"TERRAFORM_STATE_PASSPHRASE"`),
      ccolors.error(`is not set in environment`),
    );
    await emitExitEvent(605);
    Deno.exit(605);
  }

  const coreEnvLines: EnvLines = [
    { comment: "Sealed Secrets keys for Kubeseal" },
    {
      value: {
        SEALED_SECRETS_PUBLIC_KEY: sealedSecretsKeys.sealed_secrets_public_key,
      },
      wrap: true,
    },
    {
      value: {
        SEALED_SECRETS_PRIVATE_KEY:
          sealedSecretsKeys.sealed_secrets_private_key,
      },
      wrap: true,
    },
    { comment: "ArgoCD" },
    { value: { ARGOCD_ADMIN_PASSWORD } },
    { comment: "Passphrase for encrypting/decrypting terraform state" },
    { value: { TERRAFORM_STATE_PASSPHRASE } },
    { comment: "git credentials" },
    { value: { GIT_USERNAME } },
    { value: { GIT_REPO } },
    { value: { GIT_PASSWORD } },
  ];

  switch (deploymentTarget) {
    case DEPLOYMENT_TARGET.aws:
      return [...coreEnvLines, ...(await getAWSEnvLines(interactive))];
    case DEPLOYMENT_TARGET.gcp:
      return [...coreEnvLines, ...(await getGCPEnvLines(interactive))];
    case DEPLOYMENT_TARGET.azure:
      return [...coreEnvLines, ...(await getAzureEnvLines(interactive))];
    default:
      console.error(
        ccolors.key_name(`"kind"`),
        ccolors.user_input(`"${deploymentTarget}"`),
        ccolors.error(`is not yet supported`),
      );
      await emitExitEvent(606);
      Deno.exit(606);
  }
};

const availableDeploymentTargets = Object.values(DEPLOYMENT_TARGET);

export { availableDeploymentTargets, getCoreEnvLines };
