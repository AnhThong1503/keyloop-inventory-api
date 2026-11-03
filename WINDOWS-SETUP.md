# Windows setup — clean machine

This project uses Node.js 24, Git, VS Code, Docker Desktop with WSL 2, GitHub CLI and GitHub Copilot. PostgreSQL is provided by Docker Compose; do **not** install PostgreSQL separately.

## 0. Check your Windows machine

- Use a supported 64-bit Windows version and have administrator access for enabling WSL 2.
- Hardware virtualization must be enabled in BIOS/UEFI.
- Docker's current documentation lists at least 8 GB RAM and WSL 2 version 2.1.5 or later. Check Docker's live requirements for your Windows edition/build before installing: <https://docs.docker.com/desktop/setup/install/windows-install/>.

## 1. Enable WSL 2

Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

Restart Windows if prompted. Then open a new PowerShell:

```powershell
wsl --update
wsl --version
```

Confirm WSL 2 is available. Docker Desktop will use the WSL 2 backend.

## 2. Install the base tools

In PowerShell, run these one at a time:

```powershell
winget install --id Microsoft.VisualStudioCode -e
winget install --id Git.Git -e
winget install --id GitHub.cli -e
winget install --id Docker.DockerDesktop -e
```

Open Docker Desktop from the Start menu and complete first-run setup. In Docker Desktop, use the WSL 2 based engine and wait until Docker reports it is running.

## 3. Install Node.js 24 (not the newest major)

Download the current Node.js 24 Windows MSI from:

<https://nodejs.org/en/download/archive/v24>

Choose the `.msi` matching your CPU (`x64` for most PCs, `arm64` for ARM Windows). Run the installer with the default options. Open a **new** PowerShell window after installation.

Verify:

```powershell
node -v
npm -v
```

`node -v` must show `v24.x.x`. Do not install Node 26 for this project. The repository also contains `.nvmrc` with `24`.

## 4. Install VS Code extensions

After VS Code is installed, open PowerShell and run:

```powershell
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
code --install-extension ms-azuretools.vscode-docker
```

Open VS Code and sign in to GitHub when prompted. Confirm your GitHub account has access to Copilot.

## 5. Authenticate GitHub CLI and configure Git identity

Run:

```powershell
gh auth login
```

Choose GitHub.com, HTTPS, and browser authentication. Complete the browser flow. Then:

```powershell
gh auth status
gh auth setup-git
```

Configure the author identity that should appear in repository commits. Use the email you want associated with commits (your GitHub noreply email is acceptable):

```powershell
git config --global user.name "YOUR NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
git config --global init.defaultBranch main
```

Verify:

```powershell
git --version
gh --version
gh auth status
git config --global user.name
git config --global user.email
```

Do not paste access tokens or passwords into Copilot Chat.

## 6. Verify Docker

Make sure Docker Desktop is open and shows **Engine running**. In PowerShell:

```powershell
docker --version
docker compose version
docker run --rm hello-world
```

The final command must print `Hello from Docker!`.

If Docker cannot start, check `wsl --version`, run `wsl --update`, confirm hardware virtualization is enabled, restart Windows, then reopen Docker Desktop.

## 7. Create an empty GitHub repository

On GitHub.com, create a repository named `keyloop-inventory-api` under your account. Set it to **Private** unless the assessment explicitly requires public access. Create it empty: do not initialize with README, `.gitignore` or a license. This avoids an unrelated first commit.

Keep the repository URL; it will look like:

`https://github.com/YOUR_GITHUB_USERNAME/keyloop-inventory-api.git`

## 8. Create the local project and copy in this starter pack

In PowerShell:

```powershell
mkdir keyloop-inventory-api
cd keyloop-inventory-api
git init -b main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/keyloop-inventory-api.git
```

Replace `YOUR_GITHUB_USERNAME` with your real GitHub username. Now copy the starter files into the **current repository root**. The ZIP contains one top-level `keyloop-copilot-starter` folder. Assuming the ZIP is in Downloads, run the following from your current project folder (the `keyloop-inventory-api` folder):

```powershell
$extract = Join-Path $HOME "Downloads\keyloop-starter-extracted"
Expand-Archive -Path (Join-Path $HOME "Downloads\keyloop-copilot-starter.zip") -DestinationPath $extract -Force
$source = Join-Path $extract "keyloop-copilot-starter"
Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Get-Location).Path -Recurse -Force
}
```

This copies dotfiles and `.github` as well as ordinary files. If your ZIP is saved in a different folder, change the Downloads path.

Verify:

```powershell
git branch --show-current
git remote -v
git status
Get-Content .nvmrc
```

Now create the baseline commit on `main` and push it. This one-time setup commit ensures that the GitHub repository has a real `main` branch for the later Pull Request. The coding agent will not push to `main`.

```powershell
git add -A
git diff --cached --check
git commit -m "chore: add Copilot starter pack"
git push -u origin main
git switch -c feature/copilot-build
```

Verify:

```powershell
git branch --show-current
git remote -v
git status
Get-Content .nvmrc
```

Expected branch: `feature/copilot-build`; `.nvmrc` contains `24`; `origin` points at your GitHub repository; working tree is clean. The agent will make one commit per successful checkpoint and push only to `feature/copilot-build`.

## 9. Start Copilot

1. In this PowerShell window, from the repository root, run `code .`.
2. In VS Code, open the Copilot Chat view.
3. Select **Agent** (not Ask or Edit).
4. Open `MASTER-PROMPT.md`, copy its full contents and paste them into Copilot Chat.
5. Keep approval prompts enabled initially. Approve only commands you understand and that match this repository workflow. Do not enable global “Allow all” for your whole computer.

Copilot will execute P01 and continue in order. Before P02 it must pause if `.env` is not present or Docker is not ready.

## 10. After P01 — create local `.env`

Only after P01 has generated `.env.example`, open the VS Code terminal at the repository root and run:

```powershell
Copy-Item .env.example .env
```

`.env` is local-only and must never be committed or pasted into chat. The sample values are dummy credentials for local development only. Then ensure Docker Desktop is running and tell Copilot to resume the master workflow.

## PowerShell troubleshooting

If PowerShell blocks `npm` scripts with “running scripts is disabled”, run this in a normal (non-Administrator) PowerShell window:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Close and reopen PowerShell. If `node`, `git`, `docker` or `code` is not found after installation, close and reopen the terminal so PATH is refreshed.

On Windows PowerShell use `curl.exe`, not `curl`, because `curl` may be an alias for `Invoke-WebRequest`.
