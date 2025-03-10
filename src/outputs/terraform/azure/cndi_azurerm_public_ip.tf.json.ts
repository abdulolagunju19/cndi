import { getPrettyJSONString, getTFResource } from "src/utils.ts";

export default function getAzurePublicIpTFJSON(): string {
  const resource = getTFResource("azurerm_public_ip", {
    allocation_method: "Static",
    location: "${azurerm_resource_group.cndi_azurerm_resource_group.location}",
    name: "cndi_load_balancer_public_ip",
    resource_group_name:
      "${azurerm_resource_group.cndi_azurerm_resource_group.name}",
    sku: "Standard",
    zones: ["1"],
    tags: { CNDIProject: "${local.cndi_project_name}" },
  });
  return getPrettyJSONString(resource);
}
