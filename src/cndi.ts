import {
  Command,
  CompletionsCommand,
  HelpCommand,
} from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { homedir } from "https://deno.land/std@0.173.0/node/os.ts?s=homedir";
import * as path from "https://deno.land/std@0.173.0/path/mod.ts";
import upgradeCommand from "src/commands/upgrade.ts";
import runCommand from "src/commands/run.ts";
import initCommand from "src/commands/init.ts";
import { overwriteCommand } from "src/commands/overwrite.ts";
import terraformCommand from "src/commands/terraform.ts";
import destroyCommand from "src/commands/destroy.ts";
import deno_json from "../deno.json" assert { type: "json" };
import { ccolors, KUBESEAL_VERSION, TERRAFORM_VERSION } from "src/deps.ts";
import installDependenciesIfRequired from "src/install.ts";
import installCommand from "src/commands/install.ts";
import { emitExitEvent } from "src/utils.ts";

const cndiLabel = ccolors.faded("\nsrc/cndi.ts:");

export default async function cndi() {
  if (!deno_json?.version) {
    throw new Error("deno.json is missing a version");
  }

  const CNDI_VERSION = `${deno_json?.version}`;
  const CNDI_HOME = path.join(homedir() || "~", ".cndi");
  const timestamp = `${Date.now()}`;
  const stagingDirectory = path.join(CNDI_HOME, "staging", timestamp);

  Deno.env.set("CNDI_STAGING_DIRECTORY", stagingDirectory);
  Deno.env.set("CNDI_HOME", CNDI_HOME);

  await installDependenciesIfRequired({
    CNDI_HOME,
    KUBESEAL_VERSION,
    TERRAFORM_VERSION,
  });

  try {
    Deno.mkdirSync(stagingDirectory, { recursive: true });
  } catch (failedToCreateStagingDirectoryError) {
    console.error(
      cndiLabel,
      ccolors.error(`Could not create staging directory`),
      ccolors.key_name(`"${stagingDirectory}"`),
    );
    console.log(ccolors.caught(failedToCreateStagingDirectoryError, 1));
    await emitExitEvent(1);
    Deno.exit(1);
  }

  return await new Command()
    .name("cndi")
    .version(`v${CNDI_VERSION}`)
    .description("Cloud-Native Data Infrastructure")
    .meta("kubeseal", `v${KUBESEAL_VERSION}`)
    .meta("terraform", `v${TERRAFORM_VERSION}`)
    .command("init", initCommand)
    .command("overwrite", overwriteCommand)
    .command("run", runCommand)
    .command("terraform", terraformCommand)
    .command("destroy", destroyCommand)
    .command("upgrade", upgradeCommand)
    .command("install", installCommand)
    .command("completions", new CompletionsCommand().global())
    .command("help", new HelpCommand().global())
    .parse(Deno.args);
}
