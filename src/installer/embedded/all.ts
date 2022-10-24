// This file is generated automatically, do not edit!
export const embeddedFiles = {
  "src/github/CNDI_GITHUB_README.md":
    "# CNDI GitHub Workflows\n\nWe have created this file and a file called `.github/workflows/cndi-run.yaml`\n\nThe workflow file is responsible for provisioning the nodes you have defined in\n`cndi/nodes.json`.\n\nEffectively this means that the `cndi-run.yaml` workflow is only responsible for\nexecuting the command `cndi run`.\n\nAll other cluster tasks will be handled by argocd, by reading the manifests in\n`cndi/cluster` and the folders within that.\n",
  "src/github/workflows/cndi-run.yaml":
    "name: cndi\non:\n  push:\n    branches:\n      - main\n      - 'releases/**'\njobs:\n  cndi-run:\n    runs-on: ubuntu-20.04\n    steps:\n      - name: welcome\n        run: echo \"welcome to cndi!\"\n\n      - name: checkout state\n        uses: actions/checkout@v3\n        continue-on-error: true # first run has no state branch\n        with:\n          fetch-depth: 0\n          ref: '_state'\n\n      - name: save state\n        run: mv ./terraform.tfstate.gpg ~/terraform.tfstate.gpg\n        continue-on-error: true # first run has no state\n      \n      - name: echo state\n        run: stat ~/terraform.tfstate.gpg\n        continue-on-error: true # first run has no state\n\n      - name: checkout repo\n        uses: actions/checkout@v2\n        with:\n          fetch-depth: 0\n\n      - name: decrypt terraform state\n        run: gpg --batch --passphrase ${{ secrets.TERRAFORM_STATE_PASSPHRASE }} -d ~/terraform.tfstate.gpg > cndi/terraform/terraform.tfstate\n        continue-on-error: true # if we try to encrypt a non-existent tfstate file, that's fine\n\n      - name: show decrypted state\n        run: cat cndi/terraform/terraform.tfstate\n\n      - name: setup cndi\n        uses: polyseam/setup-cndi@1.0.3\n        with:\n          version: main\n\n      - name: cndi chmod\n        run: chmod +x bin/cndi # make cndi cli executable\n\n      - name: cndi install\n        run: bin/cndi install # run 'cndi install'\n\n      # this next step is the core of the workflow\n      - name: cndi run\n        env:\n          GIT_REPO:  https://github.com/${{ github.repository}}\n          GIT_USERNAME: ${{ secrets.GIT_USERNAME }}\n          GIT_PASSWORD: ${{ secrets.GIT_PASSWORD }}\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n          AWS_REGION: ${{ secrets.AWS_REGION }}\n        run: bin/cndi run  # run 'cndi run'\n\n      - name: move state out of repo\n        run: mv cndi/terraform/terraform.tfstate ~/\n      \n      - name: encrypt terraform state\n        run: gpg --symmetric --batch --yes --passphrase ${{ secrets.TERRAFORM_STATE_PASSPHRASE }}  ~/terraform.tfstate\n\n      - name: remove repo contents\n        run: git rm -r .\n\n      - name: assess damages\n        run: git status\n\n      - name: copy encrypted state back into repo\n        run: 'mv ~/terraform.tfstate.gpg .'\n\n      - name: persist terraform state\n        uses: EndBug/add-and-commit@v9\n        with:\n          new_branch: _state\n          push: origin _state --set-upstream --force\n          add: terraform.tfstate.gpg\n          commiter_name: CNDI Bot",
};
