import { getPrettyJSONString, getTFResource } from "src/utils.ts";

export default function getAzureLbRuleTFJSON(): string {
  const resource = getTFResource("azurerm_lb_rule", {
    backend_address_pool_ids: [
      "${azurerm_lb_backend_address_pool.cndi_azurerm_lb_backend_address_pool.id}",
    ],
    backend_port: 22,
    frontend_ip_configuration_name: "cndi_azurerm_lb_frontend_ip_configuration",
    frontend_port: 22,
    loadbalancer_id: "${azurerm_lb.cndi_azurerm_lb.id}",
    name: "SSH",
    protocol: "Tcp",
  }, "cndi_azurerm_lb_rule_ssh");
  return getPrettyJSONString(resource);
}
