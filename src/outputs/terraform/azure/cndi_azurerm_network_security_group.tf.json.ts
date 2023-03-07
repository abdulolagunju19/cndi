import { getPrettyJSONString } from "src/utils.ts";

export default function getAzurermNetworkSecurityGroupTFJSON(): string {
  return getPrettyJSONString({
    resource: {
      azurerm_network_security_group: {
        cndi_azurerm_network_security_group: {
          location: "${azurerm_resource_group.cndi_azurerm_resource_group.location}",
          name: "cndi_azurerm_network_security_group",
          resource_group_name: "${azurerm_resource_group.cndi_azurerm_resource_group.name}",
          security_rule: [
            {
              access: "Allow",
              description: "Allow inbound SSH traffic",
              destination_address_prefix: "*",
              destination_address_prefixes: [],
              destination_application_security_group_ids: [],
              destination_port_range: "22",
              destination_port_ranges: [],
              direction: "Inbound",
              name: "AllowSSH",
              priority: 100,
              protocol: "Tcp",
              source_address_prefix: "*",
              source_address_prefixes: [],
              source_application_security_group_ids: [],
              source_port_range: "*",
              source_port_ranges: [],
            },
            {
              access: "Allow",
              description: "Allow inbound for HTTP traffic",
              destination_address_prefix: "*",
              destination_address_prefixes: [],
              destination_application_security_group_ids: [],
              destination_port_range: "80",
              destination_port_ranges: [],
              direction: "Inbound",
              name: "AllowHTTP",
              priority: 150,
              protocol: "Tcp",
              source_address_prefix: "*",
              source_address_prefixes: [],
              source_application_security_group_ids: [],
              source_port_range: "*",
              source_port_ranges: [],
            },
            {
              access: "Allow",
              description: "Allow inbound for HTTPS traffic",
              destination_address_prefix: "*",
              destination_address_prefixes: [],
              destination_application_security_group_ids: [],
              destination_port_range: "443",
              destination_port_ranges: [],
              direction: "Inbound",
              name: "AllowHTTPS",
              priority: 200,
              protocol: "Tcp",
              source_address_prefix: "*",
              source_address_prefixes: [],
              source_application_security_group_ids: [],
              source_port_range: "*",
              source_port_ranges: [],
            },
          ],
          tags: { CNDIProject: "${local.cndi_project_name}" },
        },
      },
    },
  });
}
