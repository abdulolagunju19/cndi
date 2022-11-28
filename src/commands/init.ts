import {
  AirflowTlsTemplateAnswers,
  MastodonTlsTemplateAnswers,
  CNDIContext,
  EnvObject,
  Template,
} from "../types.ts";

import { copy } from "https://deno.land/std@0.157.0/fs/copy.ts";

import { trimPemString } from "../utils.ts";

import {
  brightRed,
  cyan,
  white,
} from "https://deno.land/std@0.158.0/fmt/colors.ts";
import * as path from "https://deno.land/std@0.157.0/path/mod.ts";
import overwriteWithFn from "./overwrite-with.ts";

import { Select } from "https://deno.land/x/cliffy@v0.25.4/prompt/select.ts";
import { Secret } from "https://deno.land/x/cliffy@v0.25.4/prompt/secret.ts";
import { Input } from "https://deno.land/x/cliffy@v0.25.4/prompt/mod.ts";

import { createSealedSecretsKeys } from "../initialize/sealedSecretsKeys.ts";

import { createTerraformStatePassphrase } from "../initialize/terraformStatePassphrase.ts";

import { createArgoUIReadOnlyPassword } from "../initialize/argoUIReadOnlyPassword.ts";

import airflowTlsTemplate, {
  getAirflowTlsTemplateEnvObject,
} from "../templates/airflow-tls.ts";
import mastodonTlsTemplate, {
  getMastodonTlsTemplateEnvObject,
} from "../templates/mastodon-tls.ts";
import basicTemplate from "../templates/basic.ts";

import { checkInitialized } from "../utils.ts";

import availableTemplates from "../templates/available-templates.ts";
import writeEnvObject from "../outputs/env.ts";
import getGitignoreContents from "../outputs/gitignore.ts";
import getREADME from "../outputs/readme.ts";
const initLabel = white("init:");

async function getAirflowTlsTemplateAnswers(
  context: CNDIContext
): Promise<AirflowTlsTemplateAnswers> {
  const { interactive } = context;

  let argocdDomainName = "argocd.example.com";
  let airflowDomainName = "airflow.example.com";
  let dagRepoUrl = "https://github.com/polyseam/demo-dag-bag";
  let letsEncryptClusterIssuerEmailAddress = "admin@example.com";

  if (interactive) {
    argocdDomainName = (await Input.prompt({
      message: cyan(
        "Please enter the domain name you want argocd to be accessible on:"
      ),
      default: argocdDomainName,
    })) as string;

    airflowDomainName = (await Input.prompt({
      message: cyan(
        "Please enter the domain name you want airflow to be accessible on:"
      ),
      default: airflowDomainName,
    })) as string;

    dagRepoUrl = (await Input.prompt({
      message: cyan(
        "Please enter the url of the git repo containing your dags:"
      ),
      default: dagRepoUrl,
    })) as string;

    letsEncryptClusterIssuerEmailAddress = (await Input.prompt({
      message: cyan(
        "Please enter the email address you want to use for lets encrypt:"
      ),
      default: letsEncryptClusterIssuerEmailAddress,
    })) as string;
  }

  return {
    argocdDomainName,
    airflowDomainName,
    dagRepoUrl,
    letsEncryptClusterIssuerEmailAddress,
  };
}

async function getMastodonTlsTemplateAnswers(
  context: CNDIContext
): Promise<MastodonTlsTemplateAnswers> {
  let argocdDomainName = "argocd.example.com";
  let mastodonDomainName = "mastodon.example.com";
  let adminUsername = 'owner';
  let adminEmail = 'owner@example.com'
  let letsEncryptClusterIssuerEmailAddress = "owner@example.com";

  if (context.interactive) {
    argocdDomainName = (await Input.prompt({
      message: cyan(
        "Please enter the domain name you want argocd to be accessible on:"
      ),
      default: argocdDomainName,
    })) as string;

    mastodonDomainName = (await Input.prompt({
      message: cyan(
        "Please enter the domain name you want mastodon to be accessible on:"
      ),
      default: mastodonDomainName,
    })) as string;

    adminUsername = (await Input.prompt({
      message: cyan(
        "Please enter the username for your new mastodon cluster admin:"
      ),
      default: adminUsername,
    })) as string;

    adminEmail = (await Input.prompt({
      message: cyan(
        "Please enter the email for your new mastodon cluster admin:"
      ),
      default: adminEmail,
    })) as string;

    letsEncryptClusterIssuerEmailAddress = (await Input.prompt({
      message: cyan(
        "Please enter the email address you want to use for lets encrypt:"
      ),
      default: letsEncryptClusterIssuerEmailAddress,
    })) as string;
  }

  return {
    argocdDomainName,
    mastodonDomainName,
    adminUsername,
    adminEmail,
    letsEncryptClusterIssuerEmailAddress,
  };
}

const getTemplateString = async (
  context: CNDIContext
): Promise<string | null> => {
  switch (context.template) {
    case "airflow-tls":
      return airflowTlsTemplate(await getAirflowTlsTemplateAnswers(context));
    case "mastodon-tls":
      return mastodonTlsTemplate(await getMastodonTlsTemplateAnswers(context));
    case "basic":
      return basicTemplate();
    default:
      return null;
  }
};

const getCoreEnvObject = async (context: CNDIContext): Promise<EnvObject> => {
  let GIT_USERNAME = "";
  let GIT_REPO = "";
  let GIT_PASSWORD = "";
  let AWS_REGION = "us-east-1";
  let AWS_ACCESS_KEY_ID = "";
  let AWS_SECRET_ACCESS_KEY = "";

  const {
    sealedSecretsKeys,
    terraformStatePassphrase,
    argoUIReadOnlyPassword,
  } = context;

  const TERRAFORM_STATE_PASSPHRASE = terraformStatePassphrase;
  const ARGO_UI_READONLY_PASSWORD = argoUIReadOnlyPassword;

  if (!sealedSecretsKeys) {
    console.log(
      initLabel,
      brightRed(`"sealedSecretsKeys" is not defined in context`)
    );
    Deno.exit(1);
  }

  if (!TERRAFORM_STATE_PASSPHRASE) {
    console.log(
      initLabel,
      brightRed(`"terraformStatePassphrase" is not defined in context`)
    );
    Deno.exit(1);
  }

  if (!ARGO_UI_READONLY_PASSWORD) {
    console.log(
      initLabel,
      brightRed(`"argoUIReadOnlyPassword" is not defined in context`)
    );
    Deno.exit(1);
  }

  const SEALED_SECRETS_PUBLIC_KEY_MATERIAL = trimPemString(
    sealedSecretsKeys.sealed_secrets_public_key
  ).replaceAll("\n", "_");

  const SEALED_SECRETS_PRIVATE_KEY_MATERIAL = trimPemString(
    sealedSecretsKeys.sealed_secrets_private_key
  ).replaceAll("\n", "_");

  if (context.interactive) {
    GIT_USERNAME = (await Input.prompt({
      message: cyan("Enter your GitHub username:"),
      default: GIT_USERNAME,
    })) as string;

    GIT_REPO = (await Input.prompt({
      message: cyan("Enter your GitHub repository URL:"),
      default: GIT_REPO,
    })) as string;

    GIT_PASSWORD = (await Secret.prompt({
      message: cyan("Enter your GitHub Personal Access Token:"),
      default: GIT_PASSWORD,
    })) as string;

    AWS_REGION = (await Input.prompt({
      message: cyan("Enter your AWS region:"),
      default: AWS_REGION,
    })) as string;

    AWS_ACCESS_KEY_ID = (await Secret.prompt({
      message: cyan("Enter your AWS access key ID:"),
      default: AWS_ACCESS_KEY_ID,
    })) as string;

    AWS_SECRET_ACCESS_KEY = (await Secret.prompt({
      message: cyan("Enter your AWS secret access key:"),
      default: AWS_SECRET_ACCESS_KEY,
    })) as string;
  }

  return {
    GIT_USERNAME: {
      comment: "Git Credentials",
      value: GIT_USERNAME,
    },
    GIT_REPO: {
      value: GIT_REPO,
    },
    GIT_PASSWORD: {
      value: GIT_PASSWORD,
    },
    AWS_REGION: {
      comment: "AWS Credentials",
      value: AWS_REGION,
    },
    AWS_ACCESS_KEY_ID: {
      value: AWS_ACCESS_KEY_ID,
    },
    AWS_SECRET_ACCESS_KEY: {
      value: AWS_SECRET_ACCESS_KEY,
    },

    SEALED_SECRETS_PUBLIC_KEY_MATERIAL: {
      comment: "Sealed Secrets keys for Kubeseal",
      value: SEALED_SECRETS_PUBLIC_KEY_MATERIAL,
    },
    SEALED_SECRETS_PRIVATE_KEY_MATERIAL: {
      value: SEALED_SECRETS_PRIVATE_KEY_MATERIAL,
    },
    ARGO_UI_READONLY_PASSWORD: {
      comment: "ArgoUI",
      value: ARGO_UI_READONLY_PASSWORD,
    },
    TERRAFORM_STATE_PASSPHRASE: {
      comment: "Passphrase for encrypting/decrypting terraform state",
      value: TERRAFORM_STATE_PASSPHRASE,
    },
  };
};

const getEnvObject = async (context: CNDIContext): Promise<EnvObject> => {
  const coreEnvObject = await getCoreEnvObject(context);

  if (!context?.template) {
    return coreEnvObject;
  }

  switch (context.template) {
    case "airflow-tls":
      return {
        ...coreEnvObject,
        ...(await getAirflowTlsTemplateEnvObject(context)),
      };
    case "mastodon-tls":
      return {
        ...coreEnvObject,
        ...(await getMastodonTlsTemplateEnvObject(context)),
      };
    case "basic":
      return coreEnvObject;
    default:
      return coreEnvObject;
  }
};

/**
 * COMMAND fn: cndi init
 * Initializes ./cndi directory with the specified config file
 * and initializes workflows in .github
 */
export default async function init(c: CNDIContext) {
  const initializing = true;
  const CNDI_CONFIG_FILENAME = "cndi-config.jsonc";

  let template = c.template;

  // if 'template' and 'interactive' are both falsy we want to look for config at 'pathToConfig'
  if (!template && !c.interactive) {
    try {
      console.log(`cndi init --file "${c.pathToConfig}"\n`);
      Deno.readFileSync(c.pathToConfig);
    } catch {
      // if config is not found at 'pathToConfig' we want to throw an error
      console.log(
        initLabel,
        brightRed(
          `cndi-config file not found at ${white(`"${c.pathToConfig}"`)}\n`
        )
      );
      console.log(
        `if you don't have a cndi-config file try ${cyan(
          "cndi init --interactive"
        )}\n`
      );
      Deno.exit(1);
    }
  } else if (c.interactive) {
    if (!template) {
      console.log("cndi init --interactive\n");
    } else {
      console.log(`cndi init --interactive --template ${template}\n`);
    }
  } else {
    if (`${template}` === "true") {
      // if template flag is truthy but empty, throw error
      console.log(`cndi init --template\n`);
      console.error(
        initLabel,
        brightRed(`--template (-t) flag requires a value`)
      );
      Deno.exit(1);
    }
    console.log(`cndi init --template ${template}\n`);
  }

  const directoryContainsCNDIFiles = await checkInitialized(c);

  const shouldContinue = directoryContainsCNDIFiles
    ? confirm(
        "It looks like you have already initialized a cndi project in this directory. Overwrite existing artifacts?"
      )
    : true;

  if (!shouldContinue) {
    Deno.exit(0);
  }

  if (template && !availableTemplates.includes(template)) {
    console.log(
      initLabel,
      brightRed(`The template you selected "${template}" is not available.\n`)
    );

    console.log("Available templates are:\n");
    console.log(`${availableTemplates.map((t) => cyan(t)).join(", ")}\n`);
    Deno.exit(1);
  }

  const sealedSecretsKeys = await createSealedSecretsKeys(c);
  const terraformStatePassphrase = createTerraformStatePassphrase();
  const argoUIReadOnlyPassword = createArgoUIReadOnlyPassword();

  const context = {
    ...c,
    sealedSecretsKeys,
    terraformStatePassphrase,
    argoUIReadOnlyPassword,
  };

  const { noGitHub, CNDI_SRC, githubDirectory, interactive, projectDirectory } =
    context;

  if (interactive && !template) {
    template = await Select.prompt({
      message: cyan("Pick a template"),
      options: [
        { name: "basic", value: "basic" },
        { name: "airflow-tls", value: "airflow-tls" },
      ],
    });
  }

  await Deno.writeTextFile(context.gitignorePath, getGitignoreContents());

  const envObject = await getEnvObject({ ...context, template });
  await writeEnvObject(context.dotEnvPath, envObject);

  if (!noGitHub) {
    try {
      // overwrite the github workflows and readme, do not clobber other files
      await copy(path.join(CNDI_SRC, "github"), githubDirectory, {
        overwrite: true,
      });
    } catch (githubCopyError) {
      console.log(
        initLabel,
        brightRed("failed to copy github integration files")
      );
      console.error(githubCopyError);
      Deno.exit(1);
    }
  }

  await Deno.writeTextFile(
    path.join(context.projectDirectory, "README.md"),
    getREADME((template as Template) || null)
  );

  // if the user has specified a template, use that
  if (template) {
    const configOutputPath = path.join(projectDirectory, CNDI_CONFIG_FILENAME);

    const templateString = await getTemplateString({ ...context, template });

    if (!templateString) {
      console.error(
        initLabel,
        brightRed(`Template "${white(template)}" not yet implemented.`)
      );
      Deno.exit(1);
    }

    await Deno.writeTextFile(configOutputPath, templateString);

    // because there is no "pathToConfig" when using a template, we need to set it here
    overwriteWithFn(
      { ...context, pathToConfig: configOutputPath },
      initializing
    );
    return;
  }

  overwriteWithFn(context, initializing);
}
