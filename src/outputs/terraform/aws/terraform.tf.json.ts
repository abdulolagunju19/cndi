import { getPrettyJSONString } from "../../../utils.ts";
import getTerraform from "../shared/basicTerraform.ts";

export default function getAWSTerraformTFJSON() {
  const terraform = getTerraform();
  terraform.required_providers.push({
    aws: {
      source: "hashicorp/aws",
      version: "~> 4.16",
    },
  });
  return getPrettyJSONString(terraform);
}
