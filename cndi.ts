import * as JSONC from "https://deno.land/std@0.152.0/encoding/jsonc.ts";
import * as flags from "https://deno.land/std@0.152.0/flags/mod.ts";
import * as path from "https://deno.land/std@0.152.0/path/mod.ts";
import "https://deno.land/std@0.152.0/dotenv/load.ts";

import {
  CreateTagsCommand,
  DescribeInstanceStatusCommand,
  EC2Client,
  EnableSerialConsoleAccessCommand,
  ImportKeyPairCommand,
  RunInstancesCommand,
} from "https://esm.sh/@aws-sdk/client-ec2@3.153.0";

import createKeyPair from "./keygen/create-keypair.ts";

import { helpStrings } from "./docs/cli/help-strings.ts";

const DEFAULT_AWS_EC2_API_VERSION = "2016-11-15";
const DEFAULT_AWS_REGION = "us-east-1";
const DEFAULT_AWS_INSTANCE_TYPE = "t2.micro";
const DEFAULT_AWS_IMAGE_ID = "ami-0cf6c10214cc015c9";

const SSH_KEY_NAME = "cndi-run-key";

// generate a keypair
const { publicKeyMaterial, privateKeyMaterial } = await createKeyPair();

// write public and private keys to disk (eventually we will skip this step)
await Deno.writeFile("public.pub", publicKeyMaterial);
await Deno.writeFile("private.pem", privateKeyMaterial);

enum NodeRole {
  "controller",
  "worker",
}

interface CNDINode {
  name: string;
  role: NodeRole;
  instanceType?: string;
  imageId?: string;
}

interface CNDIConfig {
  nodes: {
    entries: Array<CNDINode>;
    aws: {
      region: string;
      defaultBootDiskSizeGB: number;
    };
  };
}

const enum Command {
  default = "default",
  init = "init",
  "overwrite-with" = "overwrite-with",
  run = "run",
  help = "help",
}

const DEFAULT_CNDI_CONFIG_PATH = path.join(Deno.cwd(), "cndi-config.json");
const DEFAULT_CNDI_CONFIG_PATH_JSONC = `${DEFAULT_CNDI_CONFIG_PATH}c`;

const cndiArguments = flags.parse(Deno.args);

const pathToConfig = cndiArguments.f ||
  cndiArguments.file ||
  DEFAULT_CNDI_CONFIG_PATH_JSONC ||
  DEFAULT_CNDI_CONFIG_PATH;

const awsConfig = {
  apiVersion: DEFAULT_AWS_EC2_API_VERSION,
  region: DEFAULT_AWS_REGION,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") as string,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") as string,
  },
};

const ec2Client = new EC2Client(awsConfig);
await ec2Client.send(new EnableSerialConsoleAccessCommand({ DryRun: false }));
await ec2Client.send(
  new ImportKeyPairCommand({
    PublicKeyMaterial: publicKeyMaterial,
    KeyName: SSH_KEY_NAME,
  }),
);

const pathToNodes = path.join(Deno.cwd(), "cndi/nodes.json");

const loadJSONC = async (path: string) => {
  return JSONC.parse(await Deno.readTextFile(path));
};

const aws = {
  // deno-lint-ignore no-explicit-any
  addNode: (node: CNDINode, deploymentTargetConfiguration: any) => {
    try {
      const ImageId = deploymentTargetConfiguration?.aws?.ImageId ||
        DEFAULT_AWS_IMAGE_ID;
      const InstanceType = deploymentTargetConfiguration?.aws?.InstanceType ||
        DEFAULT_AWS_INSTANCE_TYPE;

      const defaultInstanceParams = {
        ImageId,
        InstanceType,
        MinCount: 1,
        MaxCount: 1,
        KeyName: SSH_KEY_NAME,
      };

      return ec2Client.send(
        new RunInstancesCommand({
          ...defaultInstanceParams,
          ...node,
        }),
      );
    } catch (e) {
      console.log("aws.addNode error", e);
    }
  },
};

const initFn = async () => {
  const config = await loadJSONC(pathToConfig) as unknown as CNDIConfig;
  // TODO: write /cluster and /cluster/application manifests
  await Deno.writeTextFile(
    pathToNodes,
    JSON.stringify(config?.nodes ?? {}, null, 2),
  );
};

const getInstanceStatuses = async (instanceIds) => {
  return ec2Client.send(
    new DescribeInstanceStatusCommand({
      InstanceIds: instanceIds,
    }),
  );
};

const overwriteWithFn = () => {
  console.log("cndi overwrite-with");
};

const runFn = async () => {
  console.log("cndi run");

  const nodes = await loadJSONC(pathToNodes);

  // @ts-ignore
  const entries = nodes?.entries as Array<CNDINode>;
  console.log("entries", entries);

  try {
    const instances = await Promise.all(entries.map((node) => {
      // @ts-ignore
      return aws.addNode(node, nodes?.deploymentTargetConfiguration as unknown);
    }));

    const instanceIds = instances.map((instance) =>
    // @ts-ignore
      instance?.Instances[0].InstanceId
    ) as Array<string>;

    const describeCmd = new DescribeInstanceStatusCommand({
      InstanceIds: instanceIds,
    });

    let instanceStatuses = [];

    while (instanceStatuses.length < instanceIds.length) {
      instanceStatuses = await getInstanceStatuses(instanceIds);
    }

    console.log("InstanceStatuses", instanceStatuses);

    console.log(instances.length, "instances created");

    // tagging instances with a Name corresponding to the user-specified node name
    const _instancesTagged = await Promise.all(
      instances.map((instance, idx) => {
        console.log("tagging instance", idx);
        // @ts-ignore
        const { InstanceId } = instance?.Instances[0];

        const instanceName = entries[idx].name;

        const tagParams = {
          Resources: [InstanceId],
          Tags: [{
            Key: "Name",
            Value: instanceName,
          }, {
            Key: "CNDIRun",
            Value: "true",
          }],
        };

        return ec2Client.send(new CreateTagsCommand(tagParams));
      }),
    );
  } catch (err) {
    console.error(err);
  }
};

const helpFn = (command: Command) => {
  const content = helpStrings?.[command];
  if (content) {
    console.log(content);
  } else {
    console.error(
      `Command "${command}" not found. Use "cndi --help" for more information.`,
    );
  }
};

const commands = {
  [Command.init]: initFn,
  [Command["overwrite-with"]]: overwriteWithFn,
  [Command.run]: runFn,
  [Command.help]: helpFn,
  [Command.default]: (c: string) => {
    console.log(
      `Command "${c}" not found. Use "cndi --help" for more information.`,
    );
  },
};

const commandsInArgs = cndiArguments._;

// if the user uses --help we will show help text
if (cndiArguments.help || cndiArguments.h) {
  const key = typeof cndiArguments.help === "boolean"
    ? "default"
    : cndiArguments.help;
  commands.help(key);

  // if the user tries to run "help" instead of --help we will say that it's not a valid command
} else if (commandsInArgs.includes("help")) {
  commands.help(Command.help);
} else {
  // in any other case we will try to run the command
  const operation = `${commandsInArgs[0]}`;

  switch (operation) {
    case Command.init:
      commands[Command.init]();
      break;
    case Command.run:
      commands[Command.run]();
      break;
    case Command["overwrite-with"]:
      commands[Command["overwrite-with"]]();
      break;
    default:
      commands[Command.default](operation);
      break;
  }
}
