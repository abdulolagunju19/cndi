import { getPrettyJSONString } from "../utils.ts";

export default function getBasicTemplate(): string {
  return getPrettyJSONString({
    nodes: {
      entries: [
        {
          name: "x-node",
          kind: "aws",
          role: "leader",
          instance_type: "m5a.xlarge",
          volume_size: 128, // GiB
        },
        {
          name: "y-node",
          kind: "aws",
          instance_type: "m5a.large",
          volume_size: 128,
        },
        {
          name: "z-node",
          kind: "aws",
          instance_type: "m5a.large",
          volume_size: 128,
        },
      ],
    },
    cluster: {
      "argo-ingress": {
        apiVersion: "networking.k8s.io/v1",
        kind: "Ingress",
        metadata: {
          name: "argocd-server-ingress",
          namespace: "argocd",
          annotations: {
            "nginx.ingress.kubernetes.io/backend-protocol": "HTTPS",
            "nginx.ingress.kubernetes.io/ssl-passthrough": "true",
          },
        },
        spec: {
          rules: [
            {
              http: {
                paths: [
                  {
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                      service: {
                        name: "argocd-server",
                        port: {
                          name: "https",
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
    applications: {},
  });
}
