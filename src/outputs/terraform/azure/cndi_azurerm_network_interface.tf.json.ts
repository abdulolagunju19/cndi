import { getPrettyJSONString, getTFResource } from "src/utils.ts";
import { AzureNodeItemSpec } from "src/types.ts";

export default function getAzureNetworkInterfaceTFJSON(
  node: AzureNodeItemSpec,
): string {
  const { name } = node;
  const resource = getTFResource(
    "azurerm_network_interface",
    {
      ip_configuration: [
        {
          name: `cndi_azurerm_network_interface_ip_config_${name}`,
          private_ip_address_allocation: "Dynamic",
          subnet_id: "${azurerm_subnet.cndi_azurerm_subnet.id}",
        },
      ],
      location:
        "${azurerm_resource_group.cndi_azurerm_resource_group.location}",
      name: `cndi_azurerm_network_interface_${name}`,
      resource_group_name:
        "${azurerm_resource_group.cndi_azurerm_resource_group.name}",
      tags: { cndi_project_name: "${local.cndi_project_name}" },
    },
    `cndi_azurerm_network_interface_${node.name}`,
  );

  return getPrettyJSONString(resource);
}
