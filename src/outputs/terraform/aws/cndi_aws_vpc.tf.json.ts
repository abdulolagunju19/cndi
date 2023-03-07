import { getPrettyJSONString } from "src/utils.ts";

export default function getAWSVPCTFJSON(): string {
  return getPrettyJSONString({
    resource: {
      aws_vpc: {
        cndi_aws_vpc: {
          cidr_block: "10.0.0.0/16",
          enable_dns_hostnames: true,
          enable_dns_support: true,
          tags: { Name: "VPC", CNDIProject: "${local.cndi_project_name}" },
        },
      },
    },
  });
}
