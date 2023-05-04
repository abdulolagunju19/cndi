import { loadRemoteJSONC } from "src/utils.ts";
import { getCoreEnvLines } from "src/deployment-targets/shared.ts";

import {
  CNDIConfig,
  DeploymentTarget,
  EnvCommentEntry,
  EnvLines,
  EnvValueEntry,
  SealedSecretsKeys,
} from "src/types.ts";

import {
  ccolors,
  Checkbox,
  Confirm,
  Input,
  List,
  Number,
  prompt,
  Secret,
  Select,
  Toggle,
} from "deps";

import getReadmeForProject from "src/outputs/readme.ts";
import { POLYSEAM_TEMPLATE_DIRECTORY } from "src/templates/knownTemplates.ts";

type TemplatePromptTypeNames =
  | "Input"
  | "Secret"
  | "Confirm"
  | "Toggle"
  | "Select"
  | "List"
  | "Checkbox"
  | "Number"
  | "Comment";

function getPromptModuleForType(
  type: TemplatePromptTypeNames,
) {
  switch (type) {
    case "Input":
      return Input;
    case "Secret":
      return Secret;
    case "Confirm":
      return Confirm;
    case "Toggle":
      return Toggle;
    case "Select":
      return Select;
    case "List":
      return List;
    case "Checkbox":
      return Checkbox;
    case "Number":
      return Number;
    case "Comment":
      return "Comment";
    default:
      throw new Error(`Unknown prompt type ${type}`);
  }
}

interface TemplatePrompt {
  name: string;
  message: string;
  type: TemplatePromptTypeNames;
  default: string;
  value?: string;
  templated?: boolean;
  comment?: string;
  hint?: string;
  transform?: (value: string) => string;
  validate?: (value: string) => boolean | string;
}

interface Template {
  "cndi-config": {
    prompts: Array<TemplatePrompt>;
    template: CNDIConfig;
  };
  "env": {
    prompts?: Array<TemplatePrompt>;
    extend_basic_env: DeploymentTarget;
  };
  "readme": {
    prompts?: Array<TemplatePrompt>;
    extend_basic_readme: DeploymentTarget;
    template?: string;
  };
}

interface TemplateResult {
  "cndiConfig": CNDIConfig;
  "env": EnvLines;
  "readme": string;
}

interface CNDIGeneratedValues {
  sealedSecretsKeys: SealedSecretsKeys;
  terraformStatePassphrase: string;
  argoUIAdminPassword: string;
}

function processRawVal(rawVal: string): string {
  // process templated string
  const beginCurly = '{{';
  const endCurly = '}}';
  const whitespace = ' ';

  

  return 
}

export default async function useTemplate(
  templateLocation: string,
  opt: {
    project_name: string;
    cndiGeneratedValues: CNDIGeneratedValues;
    interactive: boolean;
  },
): Promise<TemplateResult> {
  let templateUrl: URL;
  const { cndiGeneratedValues, interactive } = opt;

  try {
    templateUrl = new URL(templateLocation);
  } catch {
    // if it's not a valid URL, assume it's a Polyseam named template
    templateUrl = new URL(
      `${templateLocation}.json`,
      POLYSEAM_TEMPLATE_DIRECTORY,
    );
  }
  const templateObject = await loadRemoteJSONC(
    templateUrl,
  ) as unknown as Template;

  const coreEnvLines = await getCoreEnvLines(
    cndiGeneratedValues,
    templateObject.env.extend_basic_env,
    interactive,
  );

  const cndiConfigPromptDefinitions = templateObject["cndi-config"].prompts ||
    [];

  const defaultCndiConfigValues: Record<string, string> = {};

  const cndiConfigPrompts = cndiConfigPromptDefinitions.map(
    (promptDefinition) => {
      defaultCndiConfigValues[promptDefinition.name] = promptDefinition.default;
      return {
        ...promptDefinition,
        message: ccolors.prompt(promptDefinition.message),
        type: getPromptModuleForType(promptDefinition.type),
      };
    },
  );

  const cndiConfigValues = opt.interactive // deno-lint-ignore no-explicit-any
    ? await prompt(cndiConfigPrompts as unknown as any)
    : defaultCndiConfigValues;

  let cndiConfigStringified = JSON.stringify(
    templateObject["cndi-config"].template,
  );

  for (const [key, value] of Object.entries(cndiConfigValues)) {
    const stringToReplace = `$.cndi.prompts.responses.${key}`;
    cndiConfigStringified = cndiConfigStringified.replaceAll(
      stringToReplace,
      `${value}`,
    );
  }

  let cndiConfig;

  try {
    cndiConfig = JSON.parse(cndiConfigStringified);
    cndiConfig.project_name = opt.project_name;
  } catch {
    throw new Error("Invalid cndi-config.jsonc generated");
  }

  const templateEnvLines = [];

  const templateEnvPromptDefinitions: Array<TemplatePrompt> =
    templateObject?.env?.prompts || [];

  for (const p of templateEnvPromptDefinitions) {
    // if an env prompt entry has a value, it should be handled without prompting
    if(p.value) {

      const rawVal = p.value;


      const line = { value: {[p.name]: p.value }} as EnvValueEntry;
      templateEnvLines.push(line as EnvValueEntry);
      continue;
    } else if (p.type === "Comment") {
      const { comment } = p;
      templateEnvLines.push({ comment } as EnvCommentEntry);
    }
  }

  const env = [...coreEnvLines, ...templateEnvLines];

  const coreReadme = await getReadmeForProject({
    nodeKind: templateObject.readme.extend_basic_readme,
    project_name: opt.project_name,
  });

  const templateReadmeText = templateObject.readme?.template || "";

  const readme = `${coreReadme}\n\n${templateReadmeText}`;

  return {
    cndiConfig,
    env,
    readme,
  };
}
