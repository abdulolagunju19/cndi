import "https://deno.land/std@0.173.0/dotenv/load.ts";

import pullStateForRun from "src/tfstate/git/read-state.ts";
import pushStateFromRun from "src/tfstate/git/write-state.ts";
import setTF_VARs from "src/setTF_VARs.ts";
import { getPathToTerraformBinary } from "src/utils.ts";

import { ccolors, Command, path } from "deps";

const destroyLabel = ccolors.faded("\nsrc/commands/destroy.ts:");

/**
 * COMMAND cndi destroy
 * Destroys the CNDI cluster represented in the target directory
 */
const destroyCommand = new Command()
  .description(
    `Destroy cluster infrastructure corresponding to project files.`,
  )
  .option("-p, --path <path:string>", "path to your cndi git repository", {
    default: Deno.cwd(),
  })
  .env(
    "GIT_USERNAME=<value:string>",
    "Username ArgoCD will use to authenticate to your git repository.",
    { required: true },
  )
  .env(
    "GIT_PASSWORD=<value:string>",
    "Personal access token ArgoCD will use to authenticate to your git repository.",
    { required: true },
  )
  .env(
    "GIT_REPO=<value:string>",
    "URL of your git repository where your cndi project is hosted.",
    { required: true },
  )
  .env(
    "TERRAFORM_STATE_PASSPHRASE=<value:string>",
    "Passphrase used to encrypt your terraform state file.",
    { required: true },
  )
  .env(
    "SEALED_SECRETS_PRIVATE_KEY=<value:string>",
    "Private key used to encrypt your sealed secrets.",
    { required: true },
  )
  .env(
    "SEALED_SECRETS_PUBLIC_KEY=<value:string>",
    "Public key used to encrypt your sealed secrets.",
    { required: true },
  )
  .env(
    "ARGOCD_ADMIN_PASSWORD=<value:string>",
    "Password used to authenticate to the ArgoCD UI.",
    { required: true },
  )
  .action(async (options) => {
    const cmd = "cndi destroy";
    console.log(`${cmd}\n`);

    const pathToTerraformResources = path.join(
      options.path,
      "cndi",
      "terraform",
    );

    const pathToTerraformBinary = getPathToTerraformBinary();

    try {
      setTF_VARs(); // set TF_VARs using CNDI's .env variables

      await pullStateForRun({ pathToTerraformResources, cmd });

      const terraformInitCommand = new Deno.Command(pathToTerraformBinary, {
        args: [
          `-chdir=${pathToTerraformResources}`,
          "init",
        ],
        stderr: "piped",
        stdout: "piped",
      });

      const terraformInitCommandOutput = await terraformInitCommand.output();

      await Deno.stdout.write(terraformInitCommandOutput.stdout);
      await Deno.stderr.write(terraformInitCommandOutput.stderr);

      if (terraformInitCommandOutput.code !== 0) {
        console.log(destroyLabel, ccolors.error("terraform init failed"));
        Deno.exit(terraformInitCommandOutput.code);
      }

      const terraformDestroyCommand = new Deno.Command(pathToTerraformBinary, {
        args: [
          `-chdir=${pathToTerraformResources}`,
          "destroy",
          // "-auto-approve" is an option, but I don't think we want it for destroy calls
        ],
        stderr: "piped",
        stdout: "piped",
      });

      const terraformDestroyCommandOutput = await terraformDestroyCommand
        .output();

      // print any terraform output to stdout/stderr
      await Deno.stdout.write(terraformDestroyCommandOutput.stdout);
      await Deno.stderr.write(terraformDestroyCommandOutput.stderr);

      await pushStateFromRun({ pathToTerraformResources, cmd });

      // if `terraform destroy` fails, exit with the code
      if (terraformDestroyCommandOutput.code !== 0) {
        Deno.exit(terraformDestroyCommandOutput.code);
      }
    } catch (cndiDestroyError) {
      console.error(
        destroyLabel,
        ccolors.error("failed to destroy your cndi terraform resources"),
      );
      console.log(ccolors.caught(cndiDestroyError));
    }
  });

export default destroyCommand;
