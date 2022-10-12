// This file is generated automatically, do not edit!
export const embeddedFiles = {
  "src/bootstrap/controller/root-application.yaml":
    "apiVersion: argoproj.io/v1alpha1\nkind: Application\nmetadata:\n  name: root-application\n  namespace: argocd\n  finalizers:\n    - resources-finalizer.argocd.argoproj.io\nspec:\n  project: default\n  destination:\n    namespace: argocd\n    server: https://kubernetes.default.svc\n  source:\n    path: cndi/cluster\n    repoURL: _repoURL_\n    targetRevision: HEAD\n    directory:\n      recurse: true\n  syncPolicy:\n    automated:\n      prune: true\n      selfHeal: true\n    syncOptions:\n      - CreateNamespace=true",
  "src/bootstrap/controller/bootstrap.sh":
    '#!/bin/bash\n\necho "Installing snapd"\nsudo apt-get install snapd -y\necho "Installing nfs-common"\nsudo apt-get install nfs-common -y\necho "Installing microk8s"\nsudo snap install microk8s --classic --channel=1.25/stable\necho "Adding user to group"\nsudo usermod -a -G microk8s ubuntu\necho "granting access to ~/.kube"\nsudo chown -f -R ubuntu ~/.kube\necho "awaiting microk8s to be ready"\nsudo microk8s status --wait-ready\necho "microk8s is ready"\n\njoinToken=`cat /home/ubuntu/controller/join-token.txt`\n\necho "microk8s add-node: creating node invite with token $joinToken"\n\nmicrok8s add-node -t $joinToken -l 600\n\necho "token registered"\n\necho "enabling microk8s addons"\necho "  dns"\nsudo microk8s enable dns\necho "  hostpath-storage"\nsudo microk8s enable hostpath-storage\necho "  ingress"\nsudo microk8s enable ingress\necho "  community"\nsudo microk8s enable community\necho "  nfs"\nsudo microk8s enable nfs\necho "all microk8s addons enabled!"\necho "creating argocd namespace"\nsudo microk8s kubectl create namespace argocd\necho "installing argocd with manifest"\nsudo microk8s kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml\n\necho "configuring argocd"\n\nsudo microk8s kubectl apply -f /home/ubuntu/controller/argo-cmd-params.yaml\nsudo microk8s kubectl apply -f /home/ubuntu/controller/repo-config.yaml\nsudo microk8s kubectl apply -f /home/ubuntu/controller/root-application.yaml\n\necho "argo configured"\n\necho "checking microk8s status"\n\nsudo microk8s status --wait-ready\n\necho "microk8s ready"\n',
  "src/bootstrap/controller/join-token.txt": "_token_",
  "src/bootstrap/controller/repo-config.yaml":
    "apiVersion: v1\nkind: Secret\nmetadata:\n  name: private-repo\n  namespace: argocd\n  labels:\n    argocd.argoproj.io/secret-type: repository\nstringData:\n  url: _url_\n  username: _username_\n  password: _password_",
  "src/bootstrap/controller/application.yaml":
    "apiVersion: argoproj.io/v1alpha1\nkind: Application\nmetadata:\n  name: root-application\n  namespace: argocd\n  finalizers:\n    - resources-finalizer.argocd.argoproj.io\nspec:\n  project: default\n  destination:\n    namespace: argocd\n    server: https://kubernetes.default.svc\n  source:\n    path: cndi/cluster\n    repoURL: _repoURL_\n    targetRevision: HEAD\n    directory:\n      recurse: true\n  syncPolicy:\n    automated:\n      prune: true\n      selfHeal: true\n    syncOptions:\n      - CreateNamespace=true",
  "src/bootstrap/README.md":
    'The contents of the `controller` directory will be copied to each vm with the\nrole `"controller"` in your microk8s cluster\n\nThe contents of the `worker` directory will be copied to each vm with the role\n`"worker"` in your microk8s cluster\n\nWhen all the files are copied to a node, we run `/${role}/bootstrap.sh` on the\nnode, and it does the final runtime setup\n\nThese files will be modified then installed in the `.cndi/src/bootstrap`\ndirectory.\n',
  "src/bootstrap/worker/bootstrap.sh":
    '#!/bin/bash\n\necho "installing dependencies"\n\necho "Installing snapd"\nsudo apt-get install snapd -y\necho "Installing nfs-common"\nsudo apt-get install nfs-common -y\necho "Installing microk8s"\nsudo snap install microk8s --classic --channel=1.25/stable\necho "Adding user to group"\nsudo usermod -a -G microk8s ubuntu\necho "granting access to ~/.kube"\nsudo chown -f -R ubuntu ~/.kube\necho "awaiting microk8s to be ready"\nsudo microk8s status --wait-ready\necho "microk8s is ready"\n\necho "Joining the cluster with invite"\n\n. /home/ubuntu/worker/accept-invite.sh',
  "src/bootstrap/worker/accept-invite.sh":
    '#!/bin/bash\n\n# This file will be copied to CNDI_HOME/src/bootstrap/worker/accept-invite.sh\n# It will never be executed or templated, only replaced.\necho "accept-invite called untemplated"\nexit 191\necho "accepting node invite with token _TOKEN_"\nmicrok8s join _IP_ADDRESS_:25000/_TOKEN_ --worker',
  "src/github/CNDI_GITHUB_README.md":
    "# CNDI GitHub Workflows\n\nWe have created this file and a file called `.github/workflows/cndi-run.yaml`\n\nThe workflow file is responsible for provisioning the nodes you have defined in\n`cndi/nodes.json`.\n\nEffectively this means that the `cndi-run.yaml` workflow is only responsible for\nexecuting the command `cndi run`.\n\nAll other cluster tasks will be handled by argocd, by reading the manifests in\n`cndi/cluster` and the folders within that.\n",
  "src/github/workflows/cndi-run.yaml":
    "name: cndi\non:\n  push:\n    branches:\n      - main\n      - 'releases/**'\njobs:\n  cndi-run:\n    runs-on: ubuntu-20.04\n    steps:\n      - name: welcome\n        run: echo \"welcome to cndi!\"\n\n      - name: checkout\n        uses: actions/checkout@v2\n        with:\n          fetch-depth: 0\n\n      - name: validate-nodes\n        uses: johnstonmatt/is-valid-json-action@v.1.0.1\n        with:\n          path-to-file: cndi/nodes.json\n\n      - name: setup cndi\n        uses: polyseam/setup-cndi@1.0.3\n        with:\n          version: 1.0.0\n\n      - name: cndi chmod\n        run: chmod +x bin/cndi # make cndi cli executable\n\n      - name: cndi install\n        run: bin/cndi install # run 'cndi install'\n\n      # this next step is loading the state.json from the most recent successful run\n      # this is only necessary in actions because actions have an ephemeral disk layer\n      - name: load-state-json\n        uses: actions/download-artifact@v3\n        continue-on-error: true\n        with:\n          name: 'state-json'\n          path: ~/.cndi/.working/state.json\n\n      # this is the core of the workflow\n      - name: cndi run\n        env:\n          GIT_REPO:  https://github.com/${{ github.repository}}\n          GIT_USERNAME: ${{ secrets.GIT_USERNAME }}\n          GIT_PASSWORD: ${{ secrets.GIT_PASSWORD }}\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n          AWS_REGION: ${{ secrets.AWS_REGION }}\n        run: bin/cndi run  # run 'cndi run'\n\n      # if the deployment was successful we want to save the current state of the nodes for next time\n      # this is only necessary in actions because actions have an ephemeral disk layer\n      - name: save-state-json\n        uses: actions/upload-artifact@v3\n        with:\n          name: 'state-json'\n          path: ~/.cndi/.working/state.json\n        ",
};
